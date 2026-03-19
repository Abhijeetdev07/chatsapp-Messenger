'use client';

import { useEffect } from 'react';
import { useChatLayout } from '../layout';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import { useConversationStore } from '@/store/useConversationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { conversationApi } from '@/lib/api/conversationApi';

export default function ChatPage() {
  const { isSidebarOpen } = useChatLayout();
  const { setConversations, setLoading } = useConversationStore();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Fetch conversations only after auth bootstrap completes
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await conversationApi.getConversations();
        if (res.success) {
          setConversations(res.conversations);
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [isAuthenticated, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Sidebar Panel */}
      <aside
        className={`
          w-full md:w-[360px] lg:w-[400px] flex-shrink-0
          border-r border-border bg-surface
          flex flex-col h-full
          transition-all duration-300 ease-in-out
          ${!isSidebarOpen ? 'hidden md:flex' : 'flex'}
        `}
      >
        <Sidebar />
      </aside>

      {/* Chat Panel */}
      <main
        className={`
          flex-1 flex flex-col h-full min-w-0
          ${isSidebarOpen ? 'hidden md:flex' : 'flex'}
        `}
      >
        <ChatWindow />
      </main>
    </>
  );
}
