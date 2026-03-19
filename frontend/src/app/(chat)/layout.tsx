'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface ChatLayoutContextType {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

const ChatLayoutContext = createContext<ChatLayoutContextType>({
  isSidebarOpen: true,
  openSidebar: () => {},
  closeSidebar: () => {},
  toggleSidebar: () => {},
});

export const useChatLayout = () => useContext(ChatLayoutContext);

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);

  return (
    <ChatLayoutContext.Provider value={{ isSidebarOpen, openSidebar, closeSidebar, toggleSidebar }}>
      <div className="h-screen flex overflow-hidden bg-background">
        {children}
      </div>
    </ChatLayoutContext.Provider>
  );
}
