'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Copy, Reply, Trash2, Clock, AlertCircle } from 'lucide-react';
import { Message } from '@/store/useMessageStore';
import { useSocketStore } from '@/store/useSocketStore';
import { useMessageStore } from '@/store/useMessageStore';
import { uploadApi } from '@/lib/api/uploadApi';
import toast from 'react-hot-toast';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  onReply?: (message: Message) => void;
  isHighlighted?: boolean;
  searchQuery?: string;
}

export default function MessageBubble({ message, isOwn, showSenderName, onReply, isHighlighted, searchQuery }: MessageBubbleProps) {
  const isDeleted = message.deletedForEveryone;
  const time = format(new Date(message.createdAt), 'HH:mm');
  const senderName = typeof message.sender === 'object' ? message.sender?.username : null;
  const bubbleRef = useRef<HTMLDivElement>(null);
  const updateMessage = useMessageStore((s) => s.updateMessage);

  // Auto-scroll to highlighted message
  useEffect(() => {
    if (isHighlighted && bubbleRef.current) {
      bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  // Highlight matching text
  const renderHighlightedText = (text: string) => {
    if (!searchQuery?.trim() || !text) return text;
    const q = searchQuery.toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-400/40 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + searchQuery.length)}</mark>
        {text.slice(idx + searchQuery.length)}
      </>
    );
  };

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const contextRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu) return;
    const handleClick = () => setShowContextMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showContextMenu]);

  // Right-click / long-press handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isDeleted) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({
      x: isOwn ? -160 : 20,
      y: e.clientY - rect.top - 10,
    });
    setShowContextMenu(true);
  }, [isOwn, isDeleted]);

  // Touch long-press
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDeleted) return;
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuPosition({
        x: isOwn ? -160 : 20,
        y: touch.clientY - rect.top - 10,
      });
      setShowContextMenu(true);
    }, 500);
  }, [isOwn, isDeleted]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Context actions
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    toast.success('Copied to clipboard');
    setShowContextMenu(false);
  };

  const handleDelete = (forEveryone: boolean) => {
    const socket = useSocketStore.getState().socket;
    if (!socket) return;
    socket.emit('delete_message', {
      messageId: message._id,
      conversationId: message.conversationId,
      deleteForEveryone: forEveryone,
    });
    setShowContextMenu(false);
  };

  const handleRetry = async () => {
    if (!isOwn) return;
    if (message.type !== 'audio') return;
    if (message.optimisticStatus !== 'failed') return;
    if (!message.localBlob) {
      toast.error('Retry not available');
      return;
    }

    const socket = useSocketStore.getState().socket;
    if (!socket) {
      toast.error('Not connected');
      return;
    }

    const clientId = message.clientId || message._id;

    try {
      updateMessage(message.conversationId, message._id, { optimisticStatus: 'uploading' });
      const file = new File([message.localBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const res = await uploadApi.uploadFile(file);

      if (!res?.success) {
        updateMessage(message.conversationId, message._id, { optimisticStatus: 'failed' });
        toast.error('Failed to upload');
        return;
      }

      updateMessage(message.conversationId, message._id, { optimisticStatus: 'sending', mediaUrl: res.url || res.mediaUrl });
      socket.emit('send_message', {
        conversationId: message.conversationId,
        type: 'audio',
        content: '',
        mediaUrl: res.url || res.mediaUrl,
        mediaType: 'audio',
        clientId,
      });
    } catch {
      updateMessage(message.conversationId, message._id, { optimisticStatus: 'failed' });
      toast.error('Retry failed');
    }
  };

  // Read receipt icon
  const renderReadReceipt = () => {
    if (!isOwn || isDeleted) return null;
    if (message.optimisticStatus === 'uploading' || message.optimisticStatus === 'sending') {
      return <Clock className="w-3.5 h-3.5 text-white/50" />;
    }
    if (message.optimisticStatus === 'failed') {
      return null;
    }
    const readCount = message.readBy?.length || 0;
    const deliveredCount = message.deliveredTo?.length || 0;

    if (readCount > 1) {
      // Read by at least one other person (Double Blue Check)
      return <CheckCheck className="w-3.5 h-3.5 text-sky-300" />;
    }
    
    if (deliveredCount > 1) {
      // Delivered to at least one other person (Double Gray Check)
      return <CheckCheck className="w-3.5 h-3.5 text-white/50" />;
    }

    // Sent but not yet delivered (Single Gray Check)
    return <Check className="w-3.5 h-3.5 text-white/50" />;
  };

  // System message (e.g., "User joined the group")
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="px-3 py-1 rounded-full bg-surface text-foreground/40 text-[11px] border border-border">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        ref={bubbleRef}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`relative w-fit max-w-[75%] md:max-w-[60%] ${isOwn ? 'ml-auto' : 'mr-auto'}`} ref={contextRef}>
          <div
            className={
              `
              ${isOwn ? 'min-w-[4.5rem]' : 'min-w-[3.5rem]'} rounded-2xl relative transition-all duration-300 break-words [overflow-wrap:anywhere]
              ${isHighlighted ? 'ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-400/10' : ''}
              ${isDeleted
                ? 'bg-surface border border-border italic text-foreground/30 px-2.5 py-1.5'
                : isOwn
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-surface border border-border text-foreground rounded-bl-md'
              }
              px-2.5 py-1.5
            `
            }
          >
            {/* Sender name for group chats */}
            {!isOwn && showSenderName && senderName && !isDeleted && (
              <p className="text-xs font-semibold text-primary-400 mb-0.5">
                {senderName}
              </p>
            )}

            {/* Content by type */}
            {isDeleted ? (
              <p className="text-[15px]">🚫 This message was deleted</p>
            ) : (
              <>
                {/* Audio */}
                {message.type === 'audio' && message.mediaUrl && (
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <audio src={message.mediaUrl} controls className="w-full h-8 [&::-webkit-media-controls-panel]:bg-transparent" />
                  </div>
                )}

                {/* Text content */}
                {message.content && (
                  <p className={`text-[15px] whitespace-pre-wrap break-words leading-relaxed ${isOwn ? 'pr-13' : 'pr-8'} mb-0.5`}>
                    {renderHighlightedText(message.content)}
                  </p>
                )}
              </>
            )}
 
            {/* Timestamp & Read Receipt */}
            <div className="absolute bottom-1 right-2 flex items-center justify-end gap-1 mt-0.5 ml-auto w-fit">
              <span className={`text-[11px] leading-none ${isOwn ? 'text-white/60' : 'text-foreground/30'}`}>
                {time}
              </span>
              {isOwn && message.optimisticStatus === 'failed' && message.type === 'audio' && (
                <button
                  onClick={handleRetry}
                  className="p-0.5 rounded hover:bg-white/10 text-red-300 hover:text-red-200 transition-colors"
                  title="Retry"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="flex-shrink-0 flex animate-fade-in scale-90 -ml-0.5">
                {renderReadReceipt()}
              </div>
            </div>
          </div>

          {/* Context Menu */}
          {showContextMenu && (
            <div
              className="absolute z-50 w-44 bg-surface border border-border rounded-xl shadow-xl shadow-black/20 py-1 animate-fade-in"
              style={{ top: menuPosition.y, left: menuPosition.x }}
            >
              <button
                onClick={() => { onReply?.(message); setShowContextMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-surface-hover flex items-center gap-3 transition-colors"
              >
                <Reply className="w-4 h-4" /> Reply
              </button>
              {message.content && (
                <button
                  onClick={handleCopy}
                  className="w-full px-4 py-2.5 text-left text-sm text-foreground/80 hover:bg-surface-hover flex items-center gap-3 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copy
                </button>
              )}
              <hr className="border-border my-1" />
              <button
                onClick={() => handleDelete(false)}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-surface-hover flex items-center gap-3 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete for me
              </button>
              {isOwn && (
                <button
                  onClick={() => handleDelete(true)}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-surface-hover flex items-center gap-3 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete for everyone
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
