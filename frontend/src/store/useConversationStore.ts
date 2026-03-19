import { create } from 'zustand';

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  participants: any[];
  groupName?: string;
  groupAvatar?: string;
  lastMessage?: any;
  updatedAt: string;
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  updateLastMessage: (conversationId: string, message: any) => void;
  addConversation: (conversation: Conversation) => void;
  setLoading: (loading: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,

  setConversations: (conversations) => set({ conversations }),
  
  setActiveConversation: (id) => set({ activeConversationId: id }),
  
  updateLastMessage: (conversationId, message) => set((state) => ({
    conversations: state.conversations.map((conv) => 
      conv._id === conversationId 
        ? { ...conv, lastMessage: message, updatedAt: new Date().toISOString() } 
        : conv
    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  })),
  
  addConversation: (conversation) => set((state) => {
    // Prevent duplicate injections
    if (state.conversations.some(c => c._id === conversation._id)) return state;
    
    // Insert and bubble up to the top of the array based on recent update times
    return {
      conversations: [conversation, ...state.conversations].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    };
  }),

  setLoading: (loading) => set({ isLoading: loading })
}));
