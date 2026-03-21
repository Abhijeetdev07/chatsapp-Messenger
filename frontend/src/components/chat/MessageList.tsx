'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessageStore } from '@/store/useMessageStore';
import { useSocketStore } from '@/store/useSocketStore';
import { messageApi } from '@/lib/api/messageApi';
import { format, isToday, isYesterday } from 'date-fns';
import { useConversationStore } from '@/store/useConversationStore';
import { Message } from '@/store/useMessageStore';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  conversationId: string;
  onReply?: (message: Message) => void;
  highlightedMessageId?: string | null;
  searchQuery?: string;
}

const EMPTY_MESSAGES: Message[] = [];

export default function MessageList({ conversationId, onReply, highlightedMessageId, searchQuery }: MessageListProps) {
  const user = useAuthStore((s) => s.user);
  const messages = useMessageStore((s) => s.messages[conversationId]) ?? EMPTY_MESSAGES;
  const hasMore = useMessageStore((s) => s.hasMore[conversationId]) ?? true;
  const isLoading = useMessageStore((s) => s.isLoadingMessages);
  const { setMessages, appendMessages, setLoading } = useMessageStore();
  const conversation = useConversationStore((s) => s.conversations.find(c => c._id === conversationId));
  const isGroup = conversation?.type === 'group';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);
  const prevMessageCount = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Check if user is near the bottom of the scroll
  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const threshold = 150; // px from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Auto-mark messages as read (Double Blue Tick) whenever they render
  useEffect(() => {
    if (!messages || messages.length === 0 || !user?._id) return;
    const socket = useSocketStore.getState().socket;
    if (!socket) return;

    messages.forEach((msg) => {
      // If message is from someone else AND we haven't read it yet
      if (
        msg.sender?._id !== user._id && 
        msg.sender !== user._id && 
        !msg.readBy?.some((r: any) => r.user === user._id)
      ) {
        socket.emit('message_read', {
          messageId: msg._id,
          conversationId: msg.conversationId
        });
      }
    });
  }, [messages, user?._id]);

  // Initial fetch
  useEffect(() => {
    if (!conversationId) return;
    hasFetched.current = false;
    prevMessageCount.current = 0;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await messageApi.getMessages(conversationId);
        if (res.success) {
          setMessages(conversationId, res.messages, res.hasMore ?? false);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoading(false);
        hasFetched.current = true;
        // Instant-scroll to bottom on initial load
        requestAnimationFrame(() => scrollToBottom(false));
      }
    };

    fetchMessages();
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom ONLY when a new message arrives AND user is already at the bottom
  useEffect(() => {
    if (!hasFetched.current) return;
    if (messages.length > prevMessageCount.current) {
      const addedCount = messages.length - prevMessageCount.current;
      // Only auto-scroll for new messages appended at the end (not prepended history)
      if (addedCount <= 2 && isNearBottom()) {
        scrollToBottom(true);
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, isNearBottom, scrollToBottom]);

  // Scroll handler: show/hide scroll-to-bottom button + load older msgs
  const handleScroll = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    // Toggle scroll-to-bottom button
    setShowScrollBtn(!isNearBottom());

    // Load older messages on scroll-to-top
    if (container.scrollTop < 60 && hasMore && !isLoading) {
      const oldScrollHeight = container.scrollHeight;
      try {
        setLoading(true);
        const cursor = messages[0]?._id;
        const res = await messageApi.getMessages(conversationId, cursor);
        if (res.success && res.messages.length > 0) {
          appendMessages(conversationId, res.messages, res.hasMore ?? false);
          // Preserve scroll position after prepending
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight - oldScrollHeight;
          });
        }
      } catch (error) {
        console.error('Failed to load older messages:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [conversationId, hasMore, isLoading, messages, isNearBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection observer for loading older messages (alternative trigger)
  const topSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && hasFetched.current) {
          handleScroll();
        }
      },
      { root: container, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, handleScroll]);

  // Date separator logic
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const shouldShowDate = (index: number) => {
    if (index === 0) return true;
    const curr = new Date(messages[index].createdAt).toDateString();
    const prev = new Date(messages[index - 1].createdAt).toDateString();
    return curr !== prev;
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4 space-y-1 scroll-smooth"
      >
        {/* Top sentinel for intersection observer */}
        <div ref={topSentinelRef} className="h-1" />

        {/* Loading spinner for older messages */}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          </div>
        )}

        {/* Initial loading */}
        {isLoading && messages.length === 0 && (
          <div className="flex flex-col justify-end gap-6 p-4 h-full">
            {Array.from({ length: 5 }).map((_, i) => {
              const isOwn = i % 2 === 1;
              return (
                <div key={i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-pulse`}>
                  <div 
                    className={`h-16 rounded-2xl ${isOwn ? 'bg-primary-600/20 rounded-tr-sm w-1/3' : 'bg-surface-hover rounded-tl-sm w-1/2'}`} 
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* No messages yet */}
        {!isLoading && messages.length === 0 && hasFetched.current && (
          <div className="flex items-center justify-center h-full text-foreground/40 text-sm font-medium">
            Say hello 👋
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, index) => (
          <div key={msg._id}>
            {/* Date separator */}
            {shouldShowDate(index) && (
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 rounded-full bg-surface text-foreground/40 text-[11px] font-medium border border-border">
                  {getDateLabel(msg.createdAt)}
                </span>
              </div>
            )}

            <MessageBubble
              message={msg}
              isOwn={msg.sender?._id === (user as any)?._id || msg.sender?._id === (user as any)?.id || msg.sender === (user as any)?._id || msg.sender === (user as any)?.id}
              showSenderName={isGroup}
              onReply={onReply}
              isHighlighted={msg._id === highlightedMessageId}
              searchQuery={searchQuery}
            />
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-4 p-2.5 rounded-full bg-surface border border-border shadow-lg shadow-black/10 hover:bg-surface-hover text-foreground/60 hover:text-foreground transition-all animate-fade-in z-10"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
