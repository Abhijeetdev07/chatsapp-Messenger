import { create } from 'zustand';

interface PresenceState {
  onlineUsers: Set<string>;
  
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  setBulkOnline: (userIds: string[]) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  // Sets are highly optimized for direct `has()` O(1) reads without huge array .includes() loops natively
  onlineUsers: new Set(),

  setOnline: (userId) => set((state) => {
    // Cloning actively into a new Set triggers the React strict identity rendering update boundary flawlessly
    const newSet = new Set(state.onlineUsers);
    newSet.add(userId);
    return { onlineUsers: newSet };
  }),

  setOffline: (userId) => set((state) => {
    const newSet = new Set(state.onlineUsers);
    newSet.delete(userId);
    return { onlineUsers: newSet };
  }),

  setBulkOnline: (userIds) => set(() => {
    return { onlineUsers: new Set(userIds) };
  })
}));
