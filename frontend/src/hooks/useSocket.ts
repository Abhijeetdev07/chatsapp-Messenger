'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocketStore } from '@/store/useSocketStore';
import { useConversationStore } from '@/store/useConversationStore';
import { useMessageStore } from '@/store/useMessageStore';
import { usePresenceStore } from '@/store/usePresenceStore';
import { useTypingStore } from '@/store/useTypingStore';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * Central real-time hook. Mount this ONCE at the app shell level.
 * It initializes the Socket.IO connection when authenticated,
 * binds every backend event to the correct Zustand store,
 * and tears down cleanly on logout or unmount.
 */
export const useSocket = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { initializeSocket, disconnectSocket, socket } = useSocketStore();
  const { showNotification } = useNotifications();
  const listenersRegistered = useRef(false);

  // Phase 1: Connect / Disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeSocket();
    } else {
      disconnectSocket();
      listenersRegistered.current = false;
    }

    return () => {
      disconnectSocket();
      listenersRegistered.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Phase 2: Bind all event listeners once the socket connects
  useEffect(() => {
    if (!socket || listenersRegistered.current) return;
    listenersRegistered.current = true;

    // ── Presence Events ──────────────────────────────────
    socket.on('user_online', ({ userId }: { userId: string }) => {
      usePresenceStore.getState().setOnline(userId);
    });

    socket.on('user_offline', ({ userId }: { userId: string }) => {
      usePresenceStore.getState().setOffline(userId);
    });

    socket.on('status_change', ({ userId, status }: { userId: string; status: string }) => {
      if (status === 'offline') {
        usePresenceStore.getState().setOffline(userId);
      } else {
        usePresenceStore.getState().setOnline(userId);
      }
    });

    // ── Messaging Events ─────────────────────────────────
    socket.on('receive_message', (message: any) => {
      useMessageStore.getState().addNewMessage(message.conversationId, message);
      useConversationStore.getState().updateLastMessage(message.conversationId, message);

      // Notification & Sound if not from self
      if (user && message.sender?._id !== user._id) {

        if (document.visibilityState !== 'visible') {
          showNotification(message.sender?.username || 'New Message', {
            body: message.type === 'text' ? message.content : `Sent a ${message.type}`,
            icon: message.sender?.avatar || '/favicon.ico',
          });
        }
      }
    });

    socket.on('message_read_update', ({ messageId, conversationId, readBy }: any) => {
      useMessageStore.getState().updateMessage(conversationId, messageId, { readBy });
    });

    socket.on('message_deleted', ({ messageId, conversationId, deleteForEveryone }: any) => {
      if (deleteForEveryone) {
        useMessageStore.getState().updateMessage(conversationId, messageId, {
          deletedForEveryone: true,
          content: 'This message was deleted',
          mediaUrl: '',
        });
      } else {
        useMessageStore.getState().removeMessage(conversationId, messageId);
      }
    });

    // ── Typing Events ────────────────────────────────────
    socket.on('user_typing', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      useTypingStore.getState().setTyping(conversationId, userId);
    });

    socket.on('user_stopped_typing', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      useTypingStore.getState().clearTyping(conversationId, userId);
    });

    // ── Call Signaling Events ────────────────────────────
    // (Removed call features)

    // Cleanup: remove all listeners safely on unmount
    return () => {
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('status_change');
      socket.off('receive_message');
      socket.off('message_read_update');
      socket.off('message_deleted');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      listenersRegistered.current = false;
    };
  }, [socket]);

  return { socket };
};
