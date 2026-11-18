import { io } from 'socket.io-client';

const DEFAULT_SOCKET_URL = import.meta.env.PROD
  ? 'https://marketplace-5wy3.onrender.com'
  : 'http://localhost:5000';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL;

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
    });
  }
  return socket;
};
