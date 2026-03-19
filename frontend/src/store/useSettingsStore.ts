import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      theme: 'system',
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'chatup-settings',
    }
  )
);
