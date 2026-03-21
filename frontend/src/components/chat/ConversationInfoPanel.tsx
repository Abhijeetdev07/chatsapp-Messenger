'use client';

import { useState } from 'react';
import { X, Shield, LogOut, Trash2, UserPlus, UserMinus, Ban, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore, Conversation } from '@/store/useConversationStore';
import { usePresenceStore } from '@/store/usePresenceStore';
import { userApi } from '@/lib/api/userApi';
import { conversationApi } from '@/lib/api/conversationApi';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import GroupSettingsModal from './GroupSettingsModal';

interface ConversationInfoPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

export default function ConversationInfoPanel({ conversation, onClose }: ConversationInfoPanelProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);

  const isGroup = conversation.type === 'group';
  const otherUser = !isGroup
    ? conversation.participants?.find((p: any) => p._id !== user?._id)
    : null;

  const [showGroupSettings, setShowGroupSettings] = useState(false);

  const isBlocked = !!(
    !isGroup &&
    otherUser &&
    (user as any)?.blockedUsers?.some((id: any) => id?.toString?.() === otherUser._id?.toString?.() || id === otherUser._id)
  );

  const getMaskedEmail = (email?: string) => {
    if (!email || typeof email !== 'string') return '—';
    const atIndex = email.indexOf('@');
    if (atIndex <= 0) return '—';
    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    const prefix = local.slice(0, 3);
    return `${prefix}*****${domain}`;
  };

  // ── Actions ──────────────────────────────
  const handleBlockUser = async () => {
    if (!otherUser) return;
    try {
      const res = await userApi.blockUser(otherUser._id);
      if (res?.blockedUsers && user) {
        setUser({ ...user, blockedUsers: res.blockedUsers });
      }
      toast.success(`${otherUser.username} blocked`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to block');
    }
  };

  const handleUnblockUser = async () => {
    if (!otherUser) return;
    try {
      const res = await userApi.unblockUser(otherUser._id);
      if (res?.blockedUsers && user) {
        setUser({ ...user, blockedUsers: res.blockedUsers });
      }
      toast.success(`${otherUser.username} unblocked`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unblock');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await conversationApi.leaveGroup(conversation._id);
      useConversationStore.getState().setActiveConversation(null);
      toast.success('Left group');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await conversationApi.deleteGroup(conversation._id);
      useConversationStore.getState().setActiveConversation(null);
      toast.success('Group deleted');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <>
    <div className="w-full md:w-[360px] h-full border-l border-border bg-surface flex flex-col animate-slide-in-right overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-foreground/60 hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold text-foreground">
          {isGroup ? 'Group Info' : 'Contact Info'}
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Avatar & Name Section */}
        <div className="flex flex-col items-center py-8 px-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 ${isGroup ? 'bg-accent-500' : 'bg-primary-600'}`}>
            {isGroup
              ? (conversation.groupName?.charAt(0).toUpperCase() || 'G')
              : (otherUser?.username?.charAt(0).toUpperCase() || '?')
            }
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {isGroup ? conversation.groupName || 'Group Chat' : otherUser?.username || 'Unknown'}
          </h3>

          {/* Online status / last seen */}
          {!isGroup && otherUser && !isBlocked && (
            <p className={`text-sm mt-1 ${onlineUsers.has(otherUser._id) ? 'text-green-400' : 'text-foreground/40'}`}>
              {onlineUsers.has(otherUser._id)
                ? 'online'
                : otherUser.lastSeen
                  ? `last seen ${formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}`
                  : 'offline'
              }
            </p>
          )}

          {/* Group participant count */}
          {isGroup && (
            <p className="text-sm text-foreground/40 mt-1">
              {conversation.participants?.length || 0} participants
            </p>
          )}

          {/* Edit group button (admin only) */}
          {isGroup && (
            <button
              onClick={() => setShowGroupSettings(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-surface-hover hover:bg-border text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Group Settings
            </button>
          )}
        </div>

        {/* Bio / Description */}
        {!isGroup && otherUser && (
          <div className="px-4 pb-4">
            <div className="bg-background rounded-xl p-4 border border-border">
              <p className="text-xs text-foreground/40 mb-1">Email</p>
              <p className="text-sm text-foreground">{getMaskedEmail((otherUser as any).email)}</p>
            </div>
          </div>
        )}

        {/* ── Group: Participants List ── */}
        {isGroup && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                Participants
              </p>
              <button className="text-xs text-primary-500 hover:text-primary-400 transition-colors flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-1">
              {conversation.participants?.map((participant: any) => {
                const isMe = participant._id === user?._id;
                const isOnline = onlineUsers.has(participant._id);
                const isAdmin = (conversation as any).admin === participant._id || (conversation as any).admins?.includes(participant._id);

                return (
                  <div
                    key={participant._id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-primary-900 flex items-center justify-center text-white font-semibold text-xs">
                        {participant.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-surface" />
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {isMe ? 'You' : participant.username}
                        </p>
                        {isAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-500/20 text-accent-400">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] ${isOnline ? 'text-green-400' : 'text-foreground/30'}`}>
                        {isOnline ? 'online' : 'offline'}
                      </p>
                    </div>

                    {/* Remove button (visible on hover, admin only, not self) */}
                    {!isMe && (
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-foreground/30 hover:text-red-400 transition-all"
                        title="Remove participant"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Danger Zone ── */}
        <div className="px-4 pb-6">
          <div className="space-y-1">
            {/* Block user (direct chats only) */}
            {!isGroup && otherUser && (
              <button
                onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                <Ban className="w-5 h-5" />
                {isBlocked ? `Unblock ${otherUser.username}` : `Block ${otherUser.username}`}
              </button>
            )}

            {/* Leave group */}
            {isGroup && (
              <button
                onClick={handleLeaveGroup}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                <LogOut className="w-5 h-5" />
                Leave Group
              </button>
            )}

            {/* Delete group (admin only) */}
            {isGroup && (
              <button
                onClick={handleDeleteGroup}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                <Trash2 className="w-5 h-5" />
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {showGroupSettings && (
      <GroupSettingsModal
        conversation={conversation}
        onClose={() => setShowGroupSettings(false)}
      />
    )}
    </>
  );
}
