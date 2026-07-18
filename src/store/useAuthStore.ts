import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import {
  endStaffSession,
  STAFF_SESSION_IDLE_TIMEOUT_MS,
  signOutStaffAuth,
  type StaffLogoutReason,
} from '@/lib/staffSessionService';

interface AuthState {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  loginAt: string | null;
  lastActivityAt: string | null;
  expiresAt: string | null;
  login: (user: User, token: string, sessionId?: string | null) => void;
  touchActivity: () => void;
  isSessionExpired: () => boolean;
  logout: (reason?: StaffLogoutReason) => Promise<void>;
  clearAuth: () => void;
}

const emptyAuthState = {
  user: null,
  token: null,
  sessionId: null,
  isAuthenticated: false,
  loginAt: null,
  lastActivityAt: null,
  expiresAt: null,
};

function nextExpiry(nowMs = Date.now()) {
  return new Date(nowMs + STAFF_SESSION_IDLE_TIMEOUT_MS).toISOString();
}

function isExpired(expiresAt?: string | null) {
  return !expiresAt || Date.now() >= new Date(expiresAt).getTime();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...emptyAuthState,

      login: (user, token, sessionId) => {
        const now = new Date().toISOString();
        set({
          user,
          token,
          sessionId: sessionId || null,
          isAuthenticated: true,
          loginAt: now,
          lastActivityAt: now,
          expiresAt: nextExpiry(),
        });
      },

      touchActivity: () => {
        const state = get();
        if (!state.isAuthenticated || isExpired(state.expiresAt)) return;
        const now = new Date().toISOString();
        set({
          lastActivityAt: now,
          expiresAt: nextExpiry(),
        });
      },

      isSessionExpired: () => {
        const state = get();
        return Boolean(state.isAuthenticated && isExpired(state.expiresAt));
      },

      logout: async (reason = 'manual') => {
        const sessionId = get().sessionId;
        set(emptyAuthState);
        await Promise.allSettled([endStaffSession(sessionId, reason), signOutStaffAuth()]);
      },

      clearAuth: () => set(emptyAuthState),
    }),
    {
      name: 'auth-storage',
      version: 2,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
        loginAt: state.loginAt,
        lastActivityAt: state.lastActivityAt,
        expiresAt: state.expiresAt,
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState> | undefined;
        if (!state?.isAuthenticated || !state.user || !state.token) {
          return emptyAuthState;
        }

        const now = new Date().toISOString();
        const expiresAt = state.expiresAt || nextExpiry();
        if (isExpired(expiresAt)) return emptyAuthState;

        return {
          ...emptyAuthState,
          user: state.user,
          token: state.token,
          sessionId: state.sessionId || null,
          isAuthenticated: true,
          loginAt: state.loginAt || now,
          lastActivityAt: state.lastActivityAt || now,
          expiresAt,
        };
      },
    }
  )
);
