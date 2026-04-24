import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket.js';
import Landing from './pages/Landing.jsx';
import Lobby   from './pages/Lobby.jsx';
import Room    from './pages/Room.jsx';
import Game    from './pages/Game.jsx';

// Phases that belong to the "waiting room" vs the "active game"
const ROOM_PHASES = new Set(['lobby']);
const GAME_PHASES = new Set(['betting', 'playing', 'dealer_turn', 'results']);

export default function App() {
  const { emit, on, off, connected } = useSocket();

  const [screen, setScreen] = useState('landing');  // landing | lobby | room | game
  const [player, setPlayer] = useState(null);       // { playerId, username, chips }
  const [room,   setRoom]   = useState(null);       // PublicRoomState
  const [myHand, setMyHand] = useState(null);       // { hand: Card[], score }

  /* ── Socket listeners ─────────────────────────────────────── */
  useEffect(() => {
    if (connected) {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        emit('resume_session', { sessionId });
      }
    }
  }, [connected, emit]);

  useEffect(() => {
    const offReg = on('registered', data => {
      localStorage.setItem('sessionId', data.sessionId);
      setPlayer(data);
      // Only jump to lobby if not already in a room/game
      setScreen(prev => prev === 'landing' ? 'lobby' : prev);
    });

    const offExpired = on('session_expired', () => {
      localStorage.removeItem('sessionId');
      setPlayer(null);
      setScreen('landing');
    });

    const offJoined = on('room_joined', ({ room: r }) => {
      setRoom(r);
      setMyHand(null);
      setScreen(ROOM_PHASES.has(r.phase) ? 'room' : 'game');
    });

    const offState = on('room_state', r => {
      setRoom(r);

      // Sync chips from the server's public view of me
      setPlayer(prev => {
        if (!prev) return prev;
        const pub = r.players?.[prev.playerId];
        return pub ? { ...prev, chips: pub.chips } : prev;
      });

      // Auto-navigate between room / game based on phase
      setScreen(prev => {
        if (prev === 'lobby') return prev;                  // not in a room yet
        if (ROOM_PHASES.has(r.phase)) return 'room';
        if (GAME_PHASES.has(r.phase)) return 'game';
        return prev;
      });

      // Clear old hands when a new round starts betting
      if (r.phase === 'betting') {
        setMyHand(null);
      }
    });

    const offHand = on('hand_update', ({ hand, score }) => {
      setMyHand({ hand, score });
    });

    return () => {
      off('registered', offReg);
      off('session_expired', offExpired);
      off('room_joined', offJoined);
      off('room_state', offState);
      off('hand_update', offHand);
    };
  }, [on, off]);

  const handleRegister = useCallback(username => emit('register', { username }), [emit]);

  const handleLeave = useCallback(() => {
    emit('leave_room');
    setRoom(null);
    setMyHand(null);
    setScreen('lobby');
  }, [emit]);

  /* ── Render ───────────────────────────────────────────────── */
  if (screen === 'landing') {
    return <Landing onRegister={handleRegister} connected={connected} />;
  }

  if (screen === 'lobby') {
    return <Lobby player={player} emit={emit} on={on} off={off} />;
  }

  if (screen === 'room' && room) {
    return <Room player={player} room={room} emit={emit} onLeave={handleLeave} />;
  }

  if (screen === 'game' && room) {
    return (
      <Game
        player={player}
        room={room}
        myHand={myHand?.hand ?? null}
        myScore={myHand?.score ?? null}
        emit={emit} on={on} off={off}
        onLeave={handleLeave}
      />
    );
  }

  return null;
}
