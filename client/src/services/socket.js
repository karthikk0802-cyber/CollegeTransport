import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  const socketUrl = rawSocketUrl.includes('localhost')
    ? rawSocketUrl.replace('localhost', window.location.hostname)
    : rawSocketUrl;

  socket = io(socketUrl, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('Socket.IO connected. ID:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.IO disconnected. Reason:', reason);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
