'use client';

import { useCallback, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useNotifications() {
  const { notificationsEnabled } = useSettingsStore();

  useEffect(() => {
    // Request permission if not determined
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        useSettingsStore.getState().setNotificationsEnabled(false);
      }
      return permission;
    }
    return 'denied';
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!notificationsEnabled || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
        
        // Auto close after 5s
        setTimeout(() => notif.close(), 5000);
        
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.error('Notification error:', err);
      }
    }
  }, [notificationsEnabled]);

  return {
    requestPermission,
    showNotification,
  };
}
