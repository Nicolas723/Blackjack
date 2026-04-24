const { v4: uuidv4 } = require('uuid');

/** @type {Map<string, object>} */
const rooms = new Map();

function _genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom(type = 'public') {
  const id = uuidv4();
  let code;
  do { code = _genCode(); } while ([...rooms.values()].some(r => r.code === code));

  const room = {
    id, code, type,
    phase: 'lobby',       // lobby | betting | playing | dealer_turn | results
    maxPlayers: 4,
    players: {},
    dealerHand: [], dealerScore: 0,
    deck: [],
    turnOrder: [], currentTurnIndex: 0,
    turnTimer: null, turnDeadline: null,
    results: null,
    createdAt: Date.now()
  };
  rooms.set(id, room);
  return room;
}

const getRoom      = (id)   => rooms.get(id) || null;
const getRoomByCode = (code) => [...rooms.values()].find(r => r.code === code.toUpperCase()) || null;

function getPublicRooms() {
  return [...rooms.values()]
    .filter(r => r.type === 'public' && Object.keys(r.players).length < r.maxPlayers)
    .map(r => ({
      id: r.id,
      playerCount: Object.keys(r.players).length,
      maxPlayers: r.maxPlayers,
      phase: r.phase
    }));
}

function addPlayer(room, player)    { room.players[player.id] = player; }
function removePlayer(room, pid)    {
  delete room.players[pid];
  if (Object.keys(room.players).length === 0) rooms.delete(room.id);
}

module.exports = { createRoom, getRoom, getRoomByCode, getPublicRooms, addPlayer, removePlayer };
