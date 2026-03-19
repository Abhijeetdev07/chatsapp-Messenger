'use client';

import { useCallback, useRef } from 'react';
import { useSocketStore } from '@/store/useSocketStore';

const TYPING_TIMEOUT = 3000; // 3 seconds of inactivity before emitting stop

/**
 * Debounced typing indicator hook.
 * Call `handleTyping(conversationId)` on every keypress in the message input.
 * It emits `typing_start` immediately on the first keypress,
 * then waits 3 seconds of silence before emitting `typing_stop`.
 */
export const useTyping = () => {
  const isTyping = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback((conversationId: string) => {
    const socket = useSocketStore.getState().socket;
    if (!socket || !conversationId) return;

    // Emit typing_start only on the FIRST keypress (not every character)
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit('typing_start', { conversationId });
    }

    // Reset the inactivity timer on every keypress
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // After 3s of no keypresses, emit typing_stop
    timeoutRef.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit('typing_stop', { conversationId });
    }, TYPING_TIMEOUT);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    const socket = useSocketStore.getState().socket;
    if (!socket || !conversationId) return;

    if (isTyping.current) {
      isTyping.current = false;
      socket.emit('typing_stop', { conversationId });
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { handleTyping, stopTyping };
};
