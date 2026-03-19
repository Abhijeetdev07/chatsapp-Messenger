'use client';

import { useState } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Search, PanelRightOpen, Users } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore, Conversation } from '@/store/useConversationStore';
import { usePresenceStore } from '@/store/usePresenceStore';
import { useTypingStore } from '@/store/useTypingStore';
import { useChatLayout } from '@/app/(chat)/layout';
import { useWebRTC } from '@/hooks/useWebRTC';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';

interface ChatHeaderProps {
  conversation: Conversation;
  onToggleInfo?: () => void;
  onToggleSearch?: () => void;
}

export default function ChatHeader({ conversation, onToggleInfo, onToggleSearch }: ChatHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);
  const typingUsers = useTypingStore((s) => s.typingUsers[conversation._id]);
  const { startCall } = useWebRTC();
  const { openSidebar } = useChatLayout();

  // Resolve name & online status
  const isGroup = conversation.type === 'group';
  const otherUser = !isGroup
    ? conversation.participants?.find((p: any) => p._id !== user?._id)
    : null;
  const name = isGroup
    ? conversation.groupName || 'Group Chat'
    : otherUser?.username || 'Unknown';
  const isOnline = otherUser ? onlineUsers.has(otherUser._id) : false;

  // Typing status text
  const getTypingText = () => {
    if (!typingUsers || typingUsers.size === 0) return null;
    const typingArray = Array.from(typingUsers).filter((id) => id !== user?._id);
    if (typingArray.length === 0) return null;

    if (isGroup) {
      const names = typingArray.map((id) => {
        const p = conversation.participants?.find((pt: any) => pt._id === id);
        return p?.username || 'Someone';
      });
      if (names.length === 1) return `${names[0]} is typing...`;
      return `${names.length} people typing...`;
    }
    return 'typing...';
  };

  const typingText = getTypingText();

  // Subtitle: typing > online > last seen > offline
  const getSubtitle = () => {
    if (typingText) return { text: typingText, className: 'text-green-400 italic' };

    if (isGroup) {
      const count = conversation.participants?.length || 0;
      const onlineCount = conversation.participants?.filter(
        (p: any) => p._id !== user?._id && onlineUsers.has(p._id)
      ).length || 0;
      const label = `${count} participants${onlineCount > 0 ? `, ${onlineCount} online` : ''}`;
      return { text: label, className: 'text-foreground/40' };
    }

    if (isOnline) {
      return { text: 'online', className: 'text-green-400' };
    }

    // Last seen
    if (otherUser?.lastSeen) {
      try {
        const timeAgo = formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true });
        return { text: `last seen ${timeAgo}`, className: 'text-foreground/40' };
      } catch {
        return { text: 'offline', className: 'text-foreground/40' };
      }
    }

    return { text: 'offline', className: 'text-foreground/40' };
  };

  const subtitle = getSubtitle();

  const handleStartCall = (type: 'audio' | 'video') => {
    if (!otherUser) return;
    startCall(conversation._id, otherUser._id, type, otherUser.username);
  };

  return (
    <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
      <div className="flex items-center gap-3 min-w-0">
        {/* Back button — mobile only */}
        <button
          onClick={openSidebar}
          className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-surface-hover text-foreground/60 hover:text-foreground transition-colors"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {isGroup ? (
            <Avatar src={conversation.groupAvatar} fallback={<Users className="w-5 h-5" />} size="md" className="bg-accent-500 border-none" />
          ) : (
            <Avatar src={otherUser?.avatar} fallback={name || '?'} size="md" className="bg-primary-600 border-none" />
          )}
          {isOnline && !isGroup && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-surface z-10" />
          )}
        </div>

        {/* Name & Status */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          <p className={`text-xs truncate ${subtitle.className}`}>
            {subtitle.text}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={onToggleSearch} 
          className="p-2 rounded-lg hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors" 
          title="Search in chat"
          aria-label="Search conversation"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
        {!isGroup && (
          <>
            <button
              onClick={() => handleStartCall('audio')}
              className="p-2 rounded-lg hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors"
              title="Voice call"
              aria-label="Start voice call"
            >
              <Phone className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => handleStartCall('video')}
              className="p-2 rounded-lg hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors"
              title="Video call"
              aria-label="Start video call"
            >
              <Video className="w-[18px] h-[18px]" />
            </button>
          </>
        )}
        <button 
          onClick={onToggleInfo} 
          className="p-2 rounded-lg hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors" 
          title="Conversation info"
          aria-label="View conversation info"
        >
          <PanelRightOpen className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
