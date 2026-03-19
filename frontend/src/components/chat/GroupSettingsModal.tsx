'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, UserPlus, UserMinus, Camera, Check } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore, Conversation } from '@/store/useConversationStore';
import { usePresenceStore } from '@/store/usePresenceStore';
import { conversationApi } from '@/lib/api/conversationApi';
import { userApi } from '@/lib/api/userApi';
import toast from 'react-hot-toast';

interface GroupSettingsModalProps {
  conversation: Conversation;
  onClose: () => void;
}

interface UserResult {
  _id: string;
  username: string;
  email: string;
}

export default function GroupSettingsModal({ conversation, onClose }: GroupSettingsModalProps) {
  const user = useAuthStore((s) => s.user);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);

  const [groupName, setGroupName] = useState(conversation.groupName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  const isAdmin = (conversation as any).admin === user?._id || (conversation as any).admins?.includes(user?._id);
  const participantIds = new Set(conversation.participants?.map((p: any) => p._id) || []);

  // Save group name
  const handleSave = async () => {
    if (!groupName.trim()) return;
    try {
      setIsSaving(true);
      await conversationApi.updateGroup(conversation._id, { groupName: groupName.trim() });
      toast.success('Group name updated');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setIsSaving(false); }
  };

  // Search users to add
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await userApi.searchUsers(searchQuery.trim());
        if (res.success) {
          setSearchResults(
            res.users.filter((u: UserResult) => u._id !== user?._id && !participantIds.has(u._id))
          );
        }
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add member
  const handleAddMember = async (userId: string) => {
    try {
      await conversationApi.addParticipant(conversation._id, userId);
      toast.success('Member added');
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    try {
      setRemovingId(userId);
      await conversationApi.removeParticipant(conversation._id, userId);
      toast.success('Member removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    } finally { setRemovingId(null); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-2xl shadow-black/30 flex flex-col max-h-[85vh] animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Group Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-foreground/60 hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Group Avatar & Name */}
          <div className="px-5 py-6 space-y-4">
            <div className="flex justify-center">
              <button className="w-20 h-20 rounded-full bg-accent-500 flex items-center justify-center text-white text-3xl font-bold hover:ring-2 hover:ring-accent-400 transition-all relative group">
                {conversation.groupName?.charAt(0).toUpperCase() || 'G'}
                {isAdmin && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                )}
              </button>
            </div>

            {isAdmin ? (
              <div>
                <label className="text-xs font-medium text-foreground/50 block mb-1.5">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            ) : (
              <p className="text-center text-lg font-bold text-foreground">{conversation.groupName}</p>
            )}

            {isAdmin && groupName.trim() !== (conversation.groupName || '') && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            )}
          </div>

          {/* Participants */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                Participants ({conversation.participants?.length || 0})
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="text-xs text-primary-500 hover:text-primary-400 transition-colors flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {showAddMember ? 'Cancel' : 'Add'}
                </button>
              )}
            </div>

            {/* Add Member Search */}
            {showAddMember && (
              <div className="mb-3">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
                {isSearching && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  </div>
                )}
                {searchResults.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => handleAddMember(u._id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-hover transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-900 flex items-center justify-center text-white text-xs font-semibold">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm text-foreground truncate">{u.username}</p>
                    </div>
                    <UserPlus className="w-4 h-4 text-primary-500" />
                  </button>
                ))}
              </div>
            )}

            {/* Member List */}
            <div className="space-y-1">
              {conversation.participants?.map((participant: any) => {
                const isMe = participant._id === user?._id;
                const isOnline = onlineUsers.has(participant._id);
                const isParticipantAdmin = (conversation as any).admin === participant._id || (conversation as any).admins?.includes(participant._id);

                return (
                  <div key={participant._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-colors group">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-primary-900 flex items-center justify-center text-white font-semibold text-xs">
                        {participant.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-surface" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {isMe ? 'You' : participant.username}
                        </p>
                        {isParticipantAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-500/20 text-accent-400">Admin</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && !isMe && (
                      <button
                        onClick={() => handleRemoveMember(participant._id)}
                        disabled={removingId === participant._id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/30 hover:text-red-400 transition-all disabled:opacity-50"
                      >
                        {removingId === participant._id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <UserMinus className="w-4 h-4" />
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
