import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, sessionId?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      sessionId: null,
      isAuthenticated: false,
      login: (user, token, sessionId) => set({ user, token, sessionId: sessionId || null, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, sessionId: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // unique name
    }
  )
);
