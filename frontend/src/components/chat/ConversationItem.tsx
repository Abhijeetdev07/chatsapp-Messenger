'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useConversationStore, Conversation } from '@/store/useConversationStore';
import { usePresenceStore } from '@/store/usePresenceStore';
import { useTypingStore } from '@/store/useTypingStore';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { Users } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  unreadCount?: number;
}

export default function ConversationItem({ conversation, isActive, onSelect, unreadCount = 0 }: ConversationItemProps) {
  const user = useAuthStore((s) => s.user);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);
  const typingUsers = useTypingStore((s) => s.typingUsers[conversation._id]);

  // Resolve display name
  const isGroup = conversation.type === 'group';
  const otherUser = isGroup ? null : conversation.participants?.find((p: any) => p._id !== user?._id);

  const getName = () => {
    if (isGroup) return conversation.groupName || 'Group Chat';
    return otherUser?.username || 'Unknown';
  };

  // Check online status for direct chats
  const isOnline = () => {
    if (isGroup) return false;
    return otherUser ? onlineUsers.has(otherUser._id) : false;
  };

  const getInitial = () => getName().charAt(0).toUpperCase();

  // Format timestamp
  const getTime = () => {
    if (!conversation.updatedAt) return '';
    try {
      return formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false });
    } catch {
      return '';
    }
  };

  // Last message preview with sender name for groups
  const getPreview = () => {
    const msg = conversation.lastMessage;
    if (!msg) return 'No messages yet';
    if (msg.deletedForEveryone) return '🚫 Message deleted';

    let content = '';
    if (msg.type === 'audio') content = '🎵 Audio';
    else content = msg.content || '';

    // Prepend sender name for group chats
    if (conversation.type === 'group' && msg.sender) {
      const senderName = msg.sender._id === user?._id
        ? 'You'
        : msg.sender.username || 'Unknown';
      return `${senderName}: ${content}`;
    }

    return content;
  };

  // Typing indicator — find who is typing (excluding self)
  const getTypingText = () => {
    if (!typingUsers || typingUsers.size === 0) return null;
    
    const typingArray = Array.from(typingUsers).filter((id) => id !== user?._id);
    if (typingArray.length === 0) return null;

    if (conversation.type === 'group') {
      // Try to resolve username from participants
      const typingNames = typingArray.map((id) => {
        const p = conversation.participants?.find((pt: any) => pt._id === id);
        return p?.username || 'Someone';
      });
      if (typingNames.length === 1) return `${typingNames[0]} is typing...`;
      return `${typingNames.length} people typing...`;
    }

    return 'typing...';
  };

  const name = getName();
  const online = isOnline();
  const typingText = getTypingText();
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={() => onSelect(conversation._id)}
      aria-label={`Conversation with ${name}`}
      data-conversation-item="true"
      className={`
        w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150
        ${isActive
          ? 'bg-primary-600/10 border-r-[3px] border-primary-500'
          : 'hover:bg-surface-hover'
        }
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {isGroup ? (
          <Avatar src={conversation.groupAvatar} fallback={<Users className="w-5 h-5"/>} size="lg" className="bg-accent-500 border-none" />
        ) : (
          <Avatar src={otherUser?.avatar} fallback={name || '?'} size="lg" className={isActive ? 'bg-primary-600 border-none' : 'bg-primary-900 border-none'} />
        )}
        {online && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-surface z-10" />
        )}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`font-medium text-[16px] truncate ${isActive ? 'text-primary-500' : 'text-foreground'}`}>
            {name}
          </p>
          <span className={`text-[12px] flex-shrink-0 ml-2 pt-0.5 ${hasUnread ? 'text-primary-500 font-semibold' : 'text-foreground/45'}`}>
            {getTime()}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          {/* Typing indicator overrides last message preview */}
          {typingText ? (
            <p className="text-sm text-green-400 truncate italic animate-pulse-subtle">
              {typingText}
            </p>
          ) : (
            <p className="text-sm text-foreground/50 truncate leading-relaxed">
              {getPreview()}
            </p>
          )}

          {/* Unread Badge */}
          {hasUnread && (
            <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
