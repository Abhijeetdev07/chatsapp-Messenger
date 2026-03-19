import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  initializeSocket: () => void;
  disconnectSocket: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  initializeSocket: () => {
    const currentSocket = get().socket;
    const token = useAuthStore.getState().accessToken;
    
    // Prevent duplicate spawning logic strictly and gate out anonymous connections natively
    if (currentSocket || !token) return;

    // Secure explicit payload dispatch
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
    });

    socketInstance.on('connect', () => {
      console.log('Socket mapped perfectly!');
      set({ isConnected: true });
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket link disconnected natively');
      set({ isConnected: false });
    });

    socketInstance.on('connect_error', (error) => {
      // Note: "xhr poll error" just means the backend is temporarily unreachable
      // (e.g. nodemon restarted, or waking up from sleep in production).
      console.error('Socket connection error:', error.message);
    });

    set({ socket: socketInstance });
  },

  disconnectSocket: () => {
    const currentSocket = get().socket;
    if (currentSocket) {
      currentSocket.disconnect();
      set({ socket: null, isConnected: false });
    }
  }
}));
