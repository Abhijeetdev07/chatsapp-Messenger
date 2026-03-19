import { create } from 'zustand';

interface TypingState {
  // Map of conversationId → Set of userIds who are currently typing
  typingUsers: Record<string, Set<string>>;

  setTyping: (conversationId: string, userId: string) => void;
  clearTyping: (conversationId: string, userId: string) => void;
}

export const useTypingStore = create<TypingState>((set) => ({
  typingUsers: {},

  setTyping: (conversationId, userId) => set((state) => {
    const existing = state.typingUsers[conversationId] || new Set();
    const newSet = new Set(existing);
    newSet.add(userId);
    return { typingUsers: { ...state.typingUsers, [conversationId]: newSet } };
  }),

  clearTyping: (conversationId, userId) => set((state) => {
    const existing = state.typingUsers[conversationId];
    if (!existing) return state;
    const newSet = new Set(existing);
    newSet.delete(userId);
    return { typingUsers: { ...state.typingUsers, [conversationId]: newSet } };
  }),
}));
