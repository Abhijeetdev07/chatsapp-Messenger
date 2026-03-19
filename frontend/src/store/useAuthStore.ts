import { create } from 'zustand';

export interface User {
  _id: string;
  id?: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  status?: string;
  contacts?: any[];
  blockedUsers?: any[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  refreshToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // Heavily assume loading state natively until /me resolves during SSR bootstraps

  login: (user, token) => set({ 
    user, 
    accessToken: token, 
    isAuthenticated: !!token,
    isLoading: false
  }),
  
  logout: () => set({ 
    user: null, 
    accessToken: null, 
    isAuthenticated: false,
    isLoading: false
  }),
  
  setUser: (user) => set({ user }),
  
  refreshToken: (token) => set({ 
    accessToken: token, 
    isAuthenticated: !!token 
  }),

  setLoading: (loading) => set({ isLoading: loading })
}));
