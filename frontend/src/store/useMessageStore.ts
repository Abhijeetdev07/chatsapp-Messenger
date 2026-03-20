import { create } from 'zustand';

export interface Message {
  _id: string;
  clientId?: string;
  conversationId: string;
  sender: any;
  type: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  optimisticStatus?: 'uploading' | 'sending' | 'failed';
  replyTo?: any;
  deliveredTo: any[];
  readBy: any[];
  deletedFor: string[];
  deletedForEveryone: boolean;
  createdAt: string;
}

interface MessageState {
  // Keyed explicitly by conversationId strings to seamlessly support multi-channel routing
  messages: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  isLoadingMessages: boolean;

  setMessages: (conversationId: string, messages: Message[], hasMore: boolean) => void;
  appendMessages: (conversationId: string, olderMessages: Message[], hasMore: boolean) => void;
  addNewMessage: (conversationId: string, message: Message) => void;
  reconcileMessageByClientId: (conversationId: string, clientId: string, serverMessage: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: {},
  hasMore: {},
  isLoadingMessages: false,

  setMessages: (conversationId, newMessages, hasMore) => set((state) => ({
    messages: { ...state.messages, [conversationId]: newMessages },
    hasMore: { ...state.hasMore, [conversationId]: hasMore }
  })),

  appendMessages: (conversationId, olderMessages, hasMore) => set((state) => {
    const existing = state.messages[conversationId] || [];
    // Prepend older history traces perfectly during infinite-scroll pagination sweeps
    return {
      messages: { ...state.messages, [conversationId]: [...olderMessages, ...existing] },
      hasMore: { ...state.hasMore, [conversationId]: hasMore }
    };
  }),

  addNewMessage: (conversationId, message) => set((state) => {
    const existing = state.messages[conversationId] || [];
    // Prevent duplicate injections resulting from concurrent Socket + REST racing conditions
    if (existing.some(m => m._id === message._id)) return state;
    
    // Append to end
    return {
      messages: { ...state.messages, [conversationId]: [...existing, message] }
    };
  }),

  reconcileMessageByClientId: (conversationId, clientId, serverMessage) => set((state) => {
    const existing = state.messages[conversationId] || [];

    const idx = existing.findIndex((m) => m.clientId === clientId || m._id === clientId);
    if (idx === -1) {
      if (existing.some((m) => m._id === serverMessage._id)) return state;
      return {
        messages: { ...state.messages, [conversationId]: [...existing, serverMessage] }
      };
    }

    const next = [...existing];
    next[idx] = { ...serverMessage, optimisticStatus: undefined };
    return {
      messages: { ...state.messages, [conversationId]: next }
    };
  }),

  updateMessage: (conversationId, messageId, updates) => set((state) => {
    const existing = state.messages[conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [conversationId]: existing.map(m => m._id === messageId ? { ...m, ...updates } : m)
      }
    };
  }),

  removeMessage: (conversationId, messageId) => set((state) => {
    const existing = state.messages[conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [conversationId]: existing.filter(m => m._id !== messageId)
      }
    };
  }),

  setLoading: (loading) => set({ isLoadingMessages: loading })
}));
