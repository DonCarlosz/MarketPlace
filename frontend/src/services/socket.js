import { io } from 'socket.io-client';

const DEFAULT_SOCKET_URL = import.meta.env.PROD
  ? 'https://marketplace-5wy3.onrender.com'
  : 'http://localhost:5000';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL;

let socket = null;

export const getSocket = () => {
  const token = localStorage.getItem('accessToken') || null;
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

// Synchronize socket JWT auth whenever user logs in, refreshes token, or logs out
export const syncSocketAuth = (token) => {
  if (!socket) return;
  socket.auth = { token: token || null };
  if (socket.connected) {
    socket.emit('authenticate', { token: token || null });
  } else if (token) {
    socket.connect();
  }
};
