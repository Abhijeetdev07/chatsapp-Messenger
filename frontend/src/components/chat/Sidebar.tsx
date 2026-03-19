'use client';

import { useState } from 'react';
import { Plus, LogOut, Settings, MessageCircle, Users, MoreVertical } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore } from '@/store/useConversationStore';
import { useChatLayout } from '@/app/(chat)/layout';
import { authApi } from '@/lib/api/authApi';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConversationItem from './ConversationItem';
import SearchBar from './SearchBar';
import NewChatModal from './NewChatModal';
import { Avatar } from '@/components/ui/Avatar';

type TabFilter = 'all' | 'unread' | 'groups';

export default function Sidebar() {
  const router = useRouter();
  const { user, logout: logoutStore } = useAuthStore();
  const { conversations, activeConversationId, setActiveConversation, isLoading } = useConversationStore();
  const { closeSidebar } = useChatLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    logoutStore();
    router.push('/login');
    toast.success('Logged out');
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    closeSidebar();
  };

  // Filter conversations based on active tab and search
  const getFilteredConversations = () => {
    let filtered = [...conversations];

    // Tab filter
    if (activeTab === 'groups') {
      filtered = filtered.filter((c) => c.type === 'group');
    }
    // 'unread' tab is a placeholder for future unread count logic
    // For now it shows all conversations (will be wired when unread counts are tracked)

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((conv) => {
        const name = conv.type === 'group'
          ? conv.groupName || 'Group Chat'
          : conv.participants?.find((p: any) => p._id !== user?._id)?.username || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Already sorted by updatedAt from store, but ensure it
    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  };

  const filteredConversations = getFilteredConversations();

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'groups', label: 'Groups' },
  ];

  const content = (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          {/* Avatar + Title */}
          <div className="flex items-center gap-3">
            <button className="relative group" title="Profile settings">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm group-hover:ring-2 group-hover:ring-primary-400 transition-all">
                {user?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-surface" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Chats</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-lg hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors"
              title="New chat"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors"
                title="More options"
                aria-label="More options"
                aria-expanded={showMenu}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-xl shadow-black/20 z-50 py-1 animate-fade-in">
                    <button className="w-full px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-surface-hover flex items-center gap-3 transition-colors">
                      <Users className="w-4 h-4" />
                      New group
                    </button>
                    <button className="w-full px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-surface-hover flex items-center gap-3 transition-colors">
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <hr className="border-border my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-surface-hover flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
      </div>

      {/* Search Bar — dual mode: local filter + global user search */}
      <SearchBar localQuery={searchQuery} onLocalQueryChange={setSearchQuery} />
    </div>

      {/* Filter Tabs */}
      <div className="flex px-3 pt-2 pb-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200
              ${activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-foreground/50 hover:text-foreground hover:bg-surface-hover'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Skeleton Loader
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse border-b border-border/50">
                <div className="w-12 h-12 rounded-full bg-surface-hover flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="h-4 bg-surface-hover rounded-md w-1/2" />
                  <div className="h-3 bg-surface-hover rounded-md w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-foreground/30 px-6 text-center">
            <MessageCircle className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm font-medium">
              {activeTab === 'groups' ? 'No group chats' : activeTab === 'unread' ? 'All caught up!' : 'Start a new conversation'}
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col pb-4 focus:outline-none"
            role="list"
            aria-label="Conversations"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const items = Array.from(e.currentTarget.querySelectorAll('button[data-conversation-item="true"]')) as HTMLButtonElement[];
                const activeIdx = items.indexOf(document.activeElement as HTMLButtonElement);
                if (items.length === 0) return;
                
                let nextIdx = 0;
                if (activeIdx >= 0) {
                  nextIdx = e.key === 'ArrowDown' 
                    ? Math.min(activeIdx + 1, items.length - 1) 
                    : Math.max(activeIdx - 1, 0);
                }
                items[nextIdx].focus();
              }
            }}
          >
            {filteredConversations.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                isActive={conv._id === activeConversationId}
                onSelect={handleSelectConversation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Profile Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-3">
        <Avatar src={(user as any)?.avatar} fallback={user?.username || '?'} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{user?.username}</p>
          <p className="text-[11px] text-foreground/40 truncate">{user?.email}</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {content}
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </>
  );
}
