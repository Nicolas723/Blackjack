/**
 * Socket.IO event handlers — production-hardened version.
 *
 * Responsibilities:
 *  - Input validation (via validators)
 *  - Typed error handling (via AppError / handleError)
 *  - Structured logging (per-socket child logger)
 *  - State-machine guard for every event
 *  - Clean disconnection / mid-game handling
 */

const rm         = require('../rooms/roomManager');
const ge         = require('../game/gameEngine');
const logger     = require('../utils/logger');
const storage    = require('../utils/storage');
const { handleError, Errors } = require('../utils/errors');
const {
  validateUsername,
  validateRoomType,
  validateBet,
  validateAction,
  validateJoinPayload
} = require('../utils/validators');

// ─── Constants ──────────────────────────────────────────────────────────────
const TURN_MS     = 30_000;   // ms per player turn before auto-stand
const START_CHIPS = 1_000_000;
const MIN_BET     = 10_000;
const MAX_BET     = 100_000_000_000; // Allow huge bets as requested
const RESET_MS    = 3_500;   // ms to show results before betting reset

const crypto     = require('crypto');

// ─── Global player registry ─────────────────────────────────────────────────
/** @type {Map<string, Player>} sessionId → Player */
const players = new Map();
/** @type {Map<string, string>} socketId → sessionId */
const socketIdToSessionId = new Map();
/** @type {Map<string, string>} sessionId → socketId */
const sessionIdToSocketId = new Map();

// ─── State machine guards ────────────────────────────────────────────────────
/**
 * Which events are legal in which phases.
 * Key = event name, value = Set of allowed phases.
 */
const PHASE_GUARDS = {
  toggle_ready : new Set(['lobby']),
  place_bet    : new Set(['betting']),
  player_action: new Set(['playing']),
};

// ─── Handler registration ────────────────────────────────────────────────────

function registerHandlers(io, socket) {
  const log = logger.child({ socketId: socket.id });
  log.info('Socket connected');

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Build the public projection of a room (no private hands, no deck) */
  function publicRoom(room) {
    const pub = {};
    for (const [id, p] of Object.entries(room.players)) {
      const revealScore =
        room.phase === 'results'      ||
        room.phase === 'dealer_turn'  ||
        p.status === 'bust'           ||
        p.status === 'blackjack'      ||
        p.status === 'standing';

      pub[id] = {
        id          : p.id,
        username    : p.username,
        chips       : p.chips,
        bet         : p.bet,
        status      : p.status,
        isReady     : p.isReady,
        isConnected : p.isConnected,
        hand        : p.hand,
        handSize    : p.hand.length,
        score       : revealScore ? p.score : null,
      };
    }

    // Mask dealer hole card while players are still acting
    const dealerHand = (room.phase === 'playing')
      ? room.dealerHand.map((c, i) =>
          i === 1 ? { suit: 'hidden', rank: '?', faceDown: true } : c)
      : room.dealerHand;

    return {
      id                 : room.id,
      code               : room.code,
      type               : room.type,
      phase              : room.phase,
      maxPlayers         : room.maxPlayers,
      players            : pub,
      dealerHand,
      dealerScore        : room.phase === 'playing' ? null : room.dealerScore,
      currentTurnPlayerId: ge.getCurrentTurnPlayerId(room),
      turnOrder          : room.turnOrder,
      turnDeadline       : room.turnDeadline,
      results            : room.results,
    };
  }

  function broadcast(room) {
    io.to(room.id).emit('room_update', { room: publicRoom(room) });
    
    // Save all player chips to persistence
    const savedData = storage.load();
    let changed = false;
    for (const p of Object.values(room.players)) {
      if (savedData[p.username] !== p.chips) {
        savedData[p.username] = p.chips;
        changed = true;
      }
    }
    if (changed) storage.save(savedData);
  }

  function sendPrivateHand(room, pid) {
    const p = room.players[pid];
    const sId = sessionIdToSocketId.get(pid);
    const s = sId ? io.sockets.sockets.get(sId) : null;
    if (p && s) s.emit('hand_update', { hand: p.hand, score: p.score });
  }

  function broadcastHands(room) {
    for (const pid of room.turnOrder) sendPrivateHand(room, pid);
  }

  // ── Turn timer ──────────────────────────────────────────────────────────────

  function clearTimer(room) {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer   = null;
      room.turnDeadline = null;
    }
  }

  function startTurnTimer(room) {
    clearTimer(room);
    const pid = ge.getCurrentTurnPlayerId(room);
    if (!pid) return;

    room.turnDeadline = Date.now() + TURN_MS;
    io.to(room.id).emit('turn_timer', { playerId: pid, deadline: room.turnDeadline });
    log.debug('Turn timer started', { roomId: room.id, playerId: pid, deadline: room.turnDeadline });

    room.turnTimer = setTimeout(() => {
      log.info('Turn timer expired — auto-standing', { roomId: room.id, playerId: pid });
      applyAction(room, pid, 'stand');
    }, TURN_MS);
  }

  // ── Game flow ───────────────────────────────────────────────────────────────

  /** Apply hit or stand and advance the state machine */
  function applyAction(room, pid, action) {
    clearTimer(room);
    const next = action === 'hit'
      ? ge.playerHit(room, pid)
      : ge.playerStand(room, pid);

    sendPrivateHand(room, pid);
    log.info('Player action applied', { roomId: room.id, playerId: pid, action, next });

    if (next === 'dealer_turn') {
      room.phase = 'dealer_turn';
      broadcast(room);
      setTimeout(() => runDealer(room), 600);
    } else {
      room.phase = 'playing';
      broadcast(room);
      startTurnTimer(room);
    }
  }

  /** Dealer turns: Reveal card and draw one by one with delay */
  function runDealer(room) {
    if (room.phase !== 'dealer_turn') {
      room.phase = 'dealer_turn';
      // Reveal hole card
      if (room.dealerHand[1]) room.dealerHand[1].faceDown = false;
      room.dealerScore = ge.calculateScore(room.dealerHand);
      broadcast(room);
    }

    setTimeout(() => {
      // Refresh room object to check if it still exists
      const r = rm.getRoom(room.id);
      if (!r) return;

      if (r.dealerScore < 17) {
        ge.dealerDraw(r);
        broadcast(r);
        runDealer(r); // Draw next card
      } else {
        // All cards drawn, evaluate
        const results = ge.evaluateResults(r);
        r.phase       = 'results';
        r.results     = results;
        broadcast(r);
        log.info('Round results emitted', { roomId: r.id, results });
        setTimeout(() => resetToBetting(r), RESET_MS);
      }
    }, 1200); // Slower delay (1.2s) as requested
  }

  /** Reset room to betting phase for the next round */
  function resetToBetting(room) {
    // Guard: room may have been deleted if all players left
    if (!rm.getRoom(room.id)) return;

    log.info('Resetting room to betting', { roomId: room.id });
    room.phase            = 'betting';
    room.results          = null;
    room.dealerHand       = [];
    room.dealerScore      = 0;
    room.turnOrder        = [];
    room.currentTurnIndex = 0;

    for (const p of Object.values(room.players)) {
      if (!p.isConnected) {
        rm.removePlayer(room, p.id);
        continue;
      }
      p.hand     = [];
      p.score    = 0;
      p.bet      = 0;
      p.status   = 'betting';
      p.isReady  = false;
    }
    
    // Guard again in case removePlayer deleted the room
    if (!rm.getRoom(room.id)) return;
    
    broadcast(room);
  }

  // ── State machine transition helpers ────────────────────────────────────────

  function startBetting(room) {
    log.info('Transitioning to betting', { roomId: room.id });
    room.phase = 'betting';
    for (const p of Object.values(room.players)) {
      p.isReady = false; p.bet = 0;
      p.hand = []; p.score = 0; p.status = 'betting';
    }
    broadcast(room);
  }

  function startPlaying(room) {
    log.info('Transitioning to playing', { roomId: room.id });
    const next  = ge.startGame(room);
    room.phase  = next;
    broadcast(room);
    broadcastHands(room);
    if (next === 'dealer_turn') setTimeout(() => runDealer(room), 600);
    else startTurnTimer(room);
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  function self() {
    const sid = socketIdToSessionId.get(socket.id);
    return sid ? players.get(sid) : undefined;
  }
  function myRoom() {
    const p = self();
    return p?.currentRoomId ? rm.getRoom(p.currentRoomId) : null;
  }

  /** Guard: player must be registered */
  function requirePlayer() {
    const p = self();
    if (!p) throw Errors.NOT_REGISTERED();
    return p;
  }

  /** Guard: player must be in a room AND room must be in one of the allowed phases */
  function requireRoom(allowedPhases = null) {
    const room = myRoom();
    if (!room) throw Errors.NOT_IN_ROOM();
    if (allowedPhases) {
      const allowed = allowedPhases instanceof Set ? allowedPhases : new Set(allowedPhases);
      if (!allowed.has(room.phase)) throw Errors.WRONG_PHASE(room.phase);
    }
    return room;
  }

  /**
   * Wrap every socket handler in a try/catch that serialises AppErrors
   * and logs unexpected errors without crashing the process.
   */
  function safe(fn) {
    return function(payload) {
      try {
        fn(payload);
      } catch (e) {
        handleError(socket, e, log);
      }
    };
  }

  // ── Event handlers ──────────────────────────────────────────────────────────

  socket.on('resume_session', safe(({ sessionId }) => {
    if (!sessionId || !players.has(sessionId)) {
      socket.emit('session_expired');
      return;
    }

    const p = players.get(sessionId);
    socketIdToSessionId.set(socket.id, sessionId);
    sessionIdToSocketId.set(sessionId, socket.id);
    p.isConnected = true;

    socket.emit('registered', { 
      playerId: p.id, 
      username: p.username, 
      chips: p.chips, 
      currentRoomId: p.currentRoomId,
      sessionId
    });

    log.info('Player resumed session', { username: p.username, sessionId });

    // Rejoin room if they were in one
    if (p.currentRoomId) {
      const room = rm.getRoom(p.currentRoomId);
      if (room) {
        socket.join(room.id);
        socket.emit('room_joined', { room: publicRoom(room) });
        sendPrivateHand(room, p.id);
      } else {
        p.currentRoomId = null; // Room closed while they were gone
      }
    }
  }));

  socket.on('register', safe(({ username } = {}) => {
    const name = validateUsername(username);
    const sessionId = crypto.randomUUID();

    const savedData = storage.load();
    const chips     = savedData[name] !== undefined ? savedData[name] : START_CHIPS;

    const player = {
      id          : sessionId,
      username    : name,
      chips       : chips,
      bet         : 0,
      sideBets    : { perfectPairs: 0, insurance: 0, twentyOnePlusThree: 0, bustBonus: 0 },
      hand        : [],
      score       : 0,
      status      : 'waiting',
      isReady     : false,
      isConnected : true,
      currentRoomId: null,
    };
    players.set(sessionId, player);
    
    // Save immediately
    savedData[name] = chips;
    storage.save(savedData);
    socketIdToSessionId.set(socket.id, sessionId);
    sessionIdToSocketId.set(sessionId, socket.id);
    log.info('Player registered', { username: name, sessionId });
    socket.emit('registered', { playerId: sessionId, username: name, chips: START_CHIPS, sessionId });
  }));

  socket.on('get_public_rooms', safe(() => {
    socket.emit('public_rooms', rm.getPublicRooms());
  }));

  socket.on('create_room', safe(({ type } = {}) => {
    const p        = requirePlayer();
    if (p.currentRoomId) throw Errors.ALREADY_IN_ROOM();
    const roomType = validateRoomType(type);
    const room     = rm.createRoom(roomType);

    rm.addPlayer(room, p);
    p.currentRoomId = room.id;
    socket.join(room.id);

    log.info('Room created', { roomId: room.id, type: roomType, creator: p.username });
    socket.emit('room_joined', { room: publicRoom(room) });
    broadcast(room);
  }));

  socket.on('join_room', safe((payload) => {
    const p              = requirePlayer();
    if (p.currentRoomId) throw Errors.ALREADY_IN_ROOM();
    const { roomId, code } = validateJoinPayload(payload);

    const room = code ? rm.getRoomByCode(code) : rm.getRoom(roomId);
    if (!room) throw Errors.ROOM_NOT_FOUND();
    if (Object.keys(room.players).length >= room.maxPlayers) throw Errors.ROOM_FULL();

    rm.addPlayer(room, p);
    p.currentRoomId = room.id;
    if (room.phase === 'betting') p.status = 'betting'; // Permitir apostar si llegó a tiempo
    
    socket.join(room.id);

    log.info('Player joined room', { roomId: room.id, username: p.username });
    socket.emit('room_joined', { room: publicRoom(room) });
    broadcast(room);
  }));

  socket.on('toggle_ready', safe(() => {
    const p    = requirePlayer();
    const room = requireRoom(PHASE_GUARDS.toggle_ready);
    p.isReady  = !p.isReady;

    log.debug('Ready toggled', { roomId: room.id, username: p.username, isReady: p.isReady });
    broadcast(room);

    const connected = Object.values(room.players).filter(x => x.isConnected);
    // Un jugador puede saltarse la ronda marcándose como "skip"
    if (connected.length >= 1 && connected.every(x => x.isReady || x.status === 'skip')) {
      startBetting(room);
    }
  }));

  socket.on('skip_round', safe(() => {
    const p    = requirePlayer();
    const room = requireRoom(['lobby', 'betting']);
    p.status  = 'skip';
    p.isReady = false;
    p.bet     = 0;
    
    log.info('Player skipping round', { roomId: room.id, username: p.username });
    broadcast(room);
    
    // Check if we can start betting or playing phase if everyone else is ready
    const connected = Object.values(room.players).filter(x => x.isConnected);
    
    if (room.phase === 'lobby') {
      if (connected.length >= 1 && connected.every(x => x.isReady || x.status === 'skip')) {
        startBetting(room);
      }
    } else if (room.phase === 'betting') {
      const active = connected.filter(x => x.status !== 'skip');
      if (active.length > 0 && active.every(x => x.bet > 0)) {
        startPlaying(room);
      }
    }
  }));

  socket.on('place_bet', safe((payload = {}) => {
    const { amount, sideBets } = payload;
    const p    = requirePlayer();
    const room = requireRoom(PHASE_GUARDS.place_bet);
    const bet  = validateBet(amount, p.chips, MIN_BET, MAX_BET);

    p.bet    = bet;
    p.chips -= bet;
    
    // Side bets
    if (sideBets) {
      const { perfectPairs = 0, twentyOnePlusThree = 0, bustBonus = 0 } = sideBets;
      const totalSide = perfectPairs + twentyOnePlusThree + bustBonus;
      if (totalSide <= p.chips) {
        p.sideBets.perfectPairs = perfectPairs;
        p.sideBets.twentyOnePlusThree = twentyOnePlusThree;
        p.sideBets.bustBonus = bustBonus;
        p.chips -= totalSide;
      }
    }

    p.status = 'ready';

    log.info('Bet placed', { roomId: room.id, username: p.username, bet });
    broadcast(room);

    const active = Object.values(room.players).filter(x => x.isConnected && x.status !== 'skip');
    if (active.length > 0 && active.every(x => x.bet > 0)) {
      startPlaying(room);
    }
  }));

  socket.on('restock_chips', safe(() => {
    const p = requirePlayer();
    if (p.chips < MIN_BET) {
      p.chips = START_CHIPS;
      socket.emit('registered', { 
        playerId: p.id, 
        username: p.username, 
        chips: p.chips, 
        currentRoomId: p.currentRoomId,
        sessionId: p.id
      });
      log.info('Player restocked chips', { username: p.username });
      
      const room = p.currentRoomId ? rm.getRoom(p.currentRoomId) : null;
      if (room) broadcast(room);
    }
  }));

  socket.on('player_action', safe(({ action } = {}) => {
    const p      = requirePlayer();
    const room   = requireRoom(PHASE_GUARDS.player_action);
    const act    = validateAction(action);

    if (ge.getCurrentTurnPlayerId(room) !== p.id) throw Errors.NOT_YOUR_TURN();

    log.info('Player action received', { roomId: room.id, username: p.username, action: act });
    applyAction(room, p.id, act);
  }));

  socket.on('leave_room', safe(() => leaveRoom(false)));
  socket.on('disconnect', () => {
    log.info('Socket disconnected');
    leaveRoom(true);
  });

  // ── Disconnect / leave logic ────────────────────────────────────────────────

  function leaveRoom(isDisconnect) {
    const p = self();
    if (!p) return;

    const room = p.currentRoomId ? rm.getRoom(p.currentRoomId) : null;
    if (room) {
      const safePhases = new Set(['lobby', 'betting', 'results']);
      if (safePhases.has(room.phase)) {
        // Player can be removed cleanly
        rm.removePlayer(room, p.id);
        if (Object.keys(room.players).length > 0) broadcast(room);
        log.info('Player left room (safe phase)', { roomId: room.id, username: p.username, phase: room.phase });
      } else {
        // Mid-game: mark disconnected and auto-act if it's their turn
        p.isConnected = false;
        log.warn('Player disconnected mid-game', { roomId: room.id, username: p.username });
        if (ge.getCurrentTurnPlayerId(room) === p.id) {
          applyAction(room, p.id, 'stand');
        } else {
          broadcast(room);
        }
      }
    }

    p.currentRoomId = null;
    if (isDisconnect) {
      const sid = socketIdToSessionId.get(socket.id);
      if (sid) sessionIdToSocketId.delete(sid);
      socketIdToSessionId.delete(socket.id);
    }
  }
}

module.exports = { registerHandlers };
