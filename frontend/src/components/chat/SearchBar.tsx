'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowLeft, Loader2 } from 'lucide-react';
import { userApi } from '@/lib/api/userApi';
import { conversationApi } from '@/lib/api/conversationApi';
import { useConversationStore } from '@/store/useConversationStore';
import { usePresenceStore } from '@/store/usePresenceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatLayout } from '@/app/(chat)/layout';
import toast from 'react-hot-toast';

interface SearchBarProps {
  localQuery: string;
  onLocalQueryChange: (query: string) => void;
}

interface UserResult {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  status?: string;
}

export default function SearchBar({ localQuery, onLocalQueryChange }: SearchBarProps) {
  const user = useAuthStore((s) => s.user);
  const { addConversation, setActiveConversation } = useConversationStore();
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);
  const { closeSidebar } = useChatLayout();

  const [isGlobalMode, setIsGlobalMode] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced global user search
  useEffect(() => {
    if (!isGlobalMode || !globalQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await userApi.searchUsers(globalQuery.trim());
        if (res.success) {
          // Filter out self
          setSearchResults(res.users.filter((u: UserResult) => u._id !== user?._id));
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [globalQuery, isGlobalMode, user?._id]);

  // Start a new direct conversation with a user
  const handleStartChat = async (targetUser: UserResult) => {
    try {
      setIsCreating(targetUser._id);
      const res = await conversationApi.createDirect(targetUser._id);
      if (res.success) {
        addConversation(res.conversation);
        setActiveConversation(res.conversation._id);
        exitGlobalMode();
        closeSidebar();
        toast.success(`Chat with ${targetUser.username} started`);
      }
    } catch (err: any) {
      // If conversation already exists, the backend might return it
      if (err.response?.data?.conversation) {
        setActiveConversation(err.response.data.conversation._id);
        exitGlobalMode();
        closeSidebar();
      } else {
        toast.error(err.response?.data?.message || 'Failed to start chat');
      }
    } finally {
      setIsCreating(null);
    }
  };

  const enterGlobalMode = () => {
    setIsGlobalMode(true);
    setGlobalQuery('');
    setSearchResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const exitGlobalMode = () => {
    setIsGlobalMode(false);
    setGlobalQuery('');
    setSearchResults([]);
    onLocalQueryChange('');
  };

  // Global search mode UI
  if (isGlobalMode) {
    return (
      <div className="px-3 py-3">
        {/* Search input with back button */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={exitGlobalMode}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search users by name or email..."
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-primary-500/50 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            {globalQuery && (
              <button
                onClick={() => { setGlobalQuery(''); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="mt-2 max-h-80 overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center py-8 text-foreground/40">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Searching...</span>
            </div>
          )}

          {!isSearching && globalQuery.trim() && searchResults.length === 0 && (
            <div className="text-center py-8 text-foreground/30 text-sm">
              No users found for &quot;{globalQuery}&quot;
            </div>
          )}

          {searchResults.map((u) => (
            <button
              key={u._id}
              onClick={() => handleStartChat(u)}
              disabled={isCreating === u._id}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-900 flex items-center justify-center text-white font-semibold text-sm">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                {onlineUsers.has(u._id) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-surface" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">{u.username}</p>
                <p className="text-xs text-foreground/40 truncate">{u.email}</p>
              </div>

              {/* Loading spinner */}
              {isCreating === u._id && (
                <Loader2 className="w-4 h-4 animate-spin text-primary-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Local filter mode UI (default)
  return (
    <div className="px-3 py-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={localQuery}
          onChange={(e) => onLocalQueryChange(e.target.value)}
          onFocus={enterGlobalMode}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
      </div>
    </div>
  );
}
