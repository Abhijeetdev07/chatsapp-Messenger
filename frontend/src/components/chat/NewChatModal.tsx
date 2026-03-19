'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Users, Loader2, ArrowLeft, Check, Camera } from 'lucide-react';
import { userApi } from '@/lib/api/userApi';
import { conversationApi } from '@/lib/api/conversationApi';
import { useConversationStore } from '@/store/useConversationStore';
import { usePresenceStore } from '@/store/usePresenceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatLayout } from '@/app/(chat)/layout';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import toast from 'react-hot-toast';

interface NewChatModalProps {
  onClose: () => void;
}

interface UserResult {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

type Mode = 'search' | 'group-setup';

export default function NewChatModal({ onClose }: NewChatModalProps) {
  const user = useAuthStore((s) => s.user);
  const { addConversation, setActiveConversation } = useConversationStore();
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);
  const { closeSidebar } = useChatLayout();

  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Group mode
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [groupName, setGroupName] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useFocusTrap(true) as any;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await userApi.searchUsers(query.trim());
        if (res.success) {
          setResults(res.users.filter((u: UserResult) => u._id !== user?._id));
        }
      } catch { setResults([]); }
      finally { setIsSearching(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, user?._id]);

  // Start direct chat
  const handleDirectChat = async (targetUser: UserResult) => {
    try {
      setIsCreating(true);
      const res = await conversationApi.createDirect(targetUser._id);
      if (res.success) {
        addConversation(res.conversation);
        setActiveConversation(res.conversation._id);
        closeSidebar();
        onClose();
        toast.success(`Chat with ${targetUser.username}`);
      }
    } catch (err: any) {
      if (err.response?.data?.conversation) {
        setActiveConversation(err.response.data.conversation._id);
        closeSidebar();
        onClose();
      } else {
        toast.error(err.response?.data?.message || 'Failed to start chat');
      }
    } finally { setIsCreating(false); }
  };

  // Toggle user selection for group
  const toggleUser = (u: UserResult) => {
    setSelectedUsers((prev) =>
      prev.find((s) => s._id === u._id)
        ? prev.filter((s) => s._id !== u._id)
        : [...prev, u]
    );
  };

  const isSelected = (id: string) => selectedUsers.some((s) => s._id === id);

  // Create group
  const handleCreateGroup = async () => {
    if (!groupName.trim()) { toast.error('Enter a group name'); return; }
    if (selectedUsers.length < 2) { toast.error('Select at least 2 members'); return; }
    try {
      setIsCreating(true);
      const res = await conversationApi.createGroup({
        groupName: groupName.trim(),
        participants: selectedUsers.map((u) => u._id),
      });
      if (res.success) {
        addConversation(res.conversation);
        setActiveConversation(res.conversation._id);
        closeSidebar();
        onClose();
        toast.success(`Group "${groupName.trim()}" created`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally { setIsCreating(false); }
  };

  // Proceed to group setup
  const goToGroupSetup = () => setMode('group-setup');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-2xl shadow-black/30 flex flex-col max-h-[85vh] animate-fade-in"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          {mode === 'group-setup' ? (
            <button onClick={() => setMode('search')} className="p-1 rounded-lg hover:bg-surface-hover text-foreground/60 hover:text-foreground transition-colors" aria-label="Back to search">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}
          <h2 id="modal-title" className="text-base font-bold text-foreground flex-1">
            {mode === 'group-setup' ? 'New Group' : 'New Chat'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-foreground/60 hover:text-foreground transition-colors" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'search' ? (
          <>
            {/* Group mode toggle */}
            <div className="px-5 pt-3 pb-1 flex items-center gap-2">
              <button
                onClick={() => setIsGroupMode(!isGroupMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isGroupMode ? 'bg-primary-600 text-white' : 'text-foreground/50 hover:bg-surface-hover'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Create Group
              </button>
              {isGroupMode && selectedUsers.length > 0 && (
                <span className="text-xs text-foreground/40">{selectedUsers.length} selected</span>
              )}
            </div>

            {/* Selected Users Chips */}
            {isGroupMode && selectedUsers.length > 0 && (
              <div className="px-5 py-2 flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => toggleUser(u)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-600/15 text-primary-400 text-xs font-medium hover:bg-primary-600/25 transition-colors"
                  >
                    {u.username}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="px-5 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search by username or email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {isSearching && (
                <div className="flex items-center justify-center py-8 text-foreground/40">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Searching...</span>
                </div>
              )}

              {!isSearching && query.trim() && results.length === 0 && (
                <p className="text-center py-8 text-foreground/30 text-sm">No users found</p>
              )}

              {results.map((u) => (
                <button
                  key={u._id}
                  onClick={() => isGroupMode ? toggleUser(u) : handleDirectChat(u)}
                  disabled={isCreating}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors disabled:opacity-50 ${
                    isSelected(u._id) ? 'bg-primary-600/10' : 'hover:bg-surface-hover'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary-900 flex items-center justify-center text-white font-semibold text-sm">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    {onlineUsers.has(u._id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-surface" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{u.username}</p>
                    <p className="text-xs text-foreground/40 truncate">{u.email}</p>
                  </div>
                  {isGroupMode && isSelected(u._id) && (
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Group Continue Button */}
            {isGroupMode && selectedUsers.length >= 2 && (
              <div className="px-5 py-3 border-t border-border">
                <button
                  onClick={goToGroupSetup}
                  className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-all"
                >
                  Continue with {selectedUsers.length} members
                </button>
              </div>
            )}
          </>
        ) : (
          /* Group Setup Step */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 px-5 py-6 space-y-4">
              {/* Group Avatar Placeholder */}
              <div className="flex justify-center">
                <button className="w-20 h-20 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 hover:bg-accent-500/30 transition-colors border-2 border-dashed border-accent-500/30">
                  <Camera className="w-8 h-8" />
                </button>
              </div>

              {/* Group Name */}
              <div>
                <label className="text-xs font-medium text-foreground/50 block mb-1.5">Group Name</label>
                <input
                  type="text"
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Selected Members */}
              <div>
                <label className="text-xs font-medium text-foreground/50 block mb-2">
                  Members ({selectedUsers.length})
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedUsers.map((u) => (
                    <div key={u._id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary-900 flex items-center justify-center text-white font-semibold text-xs">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm text-foreground flex-1 truncate">{u.username}</p>
                      <button
                        onClick={() => toggleUser(u)}
                        className="text-foreground/30 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Create Button */}
            <div className="px-5 py-3 border-t border-border">
              <button
                onClick={handleCreateGroup}
                disabled={isCreating || !groupName.trim() || selectedUsers.length < 2}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                ) : (
                  `Create Group`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
