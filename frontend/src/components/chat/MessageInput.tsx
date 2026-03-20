'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Smile, X, Mic } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useSocketStore } from '@/store/useSocketStore';
import { useTyping } from '@/hooks/useTyping';
import { uploadApi } from '@/lib/api/uploadApi';
import { Message } from '@/store/useMessageStore';
import toast from 'react-hot-toast';

interface MessageInputProps {
  conversationId: string;
  replyTo?: Message | null;
  onCancelReply?: () => void;
}

export default function MessageInput({ conversationId, replyTo, onCancelReply }: MessageInputProps) {
  const socket = useSocketStore((s) => s.socket);
  const { handleTyping, stopTyping } = useTyping();

  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmoji]);

  // ─── Send Text Message ──────────────────────────────
  const handleSend = useCallback(() => {
    if (!message.trim() || !socket) return;

    socket.emit('send_message', {
      conversationId,
      type: 'text',
      content: message.trim(),
      replyTo: replyTo?._id || null,
    });

    setMessage('');
    stopTyping(conversationId);
    onCancelReply?.();

    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [message, socket, conversationId, replyTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Emoji ──────────────────────────────────────────
  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  // ─── Keyboard ───────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping(conversationId);

    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // ─── Voice Recording ───────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceNote(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const sendVoiceNote = async (blob: Blob) => {
    if (!socket) return;
    try {
      setIsUploading(true);
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const res = await uploadApi.uploadFile(file);

      if (res.success) {
        socket.emit('send_message', {
          conversationId,
          type: 'audio',
          content: '',
          mediaUrl: res.url || res.mediaUrl,
          mediaType: 'audio',
        });
      }
    } catch {
      toast.error('Failed to send voice note');
    } finally {
      setIsUploading(false);
      setRecordingDuration(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const hasContent = message.trim().length > 0;

  return (
    <div className="border-t border-border bg-surface relative">
      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-3">
          <div className="w-1 h-10 rounded-full bg-primary-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary-500">
              {typeof replyTo.sender === 'object' ? replyTo.sender?.username : 'User'}
            </p>
            <p className="text-xs text-foreground/50 truncate">
              {replyTo.type !== 'text' ? `📎 ${replyTo.type}` : replyTo.content}
            </p>
          </div>
          <button onClick={onCancelReply} className="p-1 rounded hover:bg-surface-hover text-foreground/40 hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recording Bar */}
      {isRecording ? (
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={cancelRecording}
            className="p-2.5 rounded-xl hover:bg-surface-hover text-red-400 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-400 font-mono">{formatDuration(recordingDuration)}</span>
            <span className="text-xs text-foreground/40">Recording...</span>
          </div>
          <button
            onClick={stopRecording}
            className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-all"
            title="Send voice note"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Main Input Area */
        <div className="px-4 py-3">
          {/* Emoji Picker */}
          {showEmoji && (
            <div ref={emojiRef} className="absolute bottom-full left-4 mb-2 z-50 animate-slide-up">
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={handleEmojiClick}
                width={320}
                height={400}
                searchPlaceHolder="Search emoji..."
                lazyLoadEmojis
              />
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none max-h-[120px]"
              />
            </div>

            {/* Emoji */}
            <button
              onClick={() => { setShowEmoji(!showEmoji); }}
              className={`p-2.5 rounded-xl hover:bg-surface-hover transition-colors flex-shrink-0 ${showEmoji ? 'text-primary-500' : 'text-foreground/50 hover:text-foreground'}`}
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Send or Voice */}
            {hasContent ? (
              <button
                onClick={handleSend}
                disabled={isUploading}
                className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                className="p-2.5 rounded-xl hover:bg-surface-hover text-foreground/50 hover:text-primary-500 transition-colors flex-shrink-0"
                title="Hold to record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
