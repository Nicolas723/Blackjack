import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// En producción, usamos el mismo host (el servidor y cliente estarán juntos). 
// En desarrollo, apuntamos al puerto 3001.
const SERVER_URL = import.meta.env.PROD ? '/' : 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Initialise socket once
  useEffect(() => {
    const s = io(SERVER_URL, { autoConnect: true, reconnectionAttempts: 5 });
    socketRef.current = s;
    s.on('connect',    () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    return () => s.disconnect();
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, fn) => {
    socketRef.current?.on(event, fn);
    return () => socketRef.current?.off(event, fn);
  }, []);

  const off = useCallback((event, fn) => {
    socketRef.current?.off(event, fn);
  }, []);

  return { emit, on, off, connected, socketId: socketRef.current?.id };
}
