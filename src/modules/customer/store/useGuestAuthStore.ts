import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import {
  endGuestSession,
  startGuestSession,
  touchGuestSession,
  type GuestSessionContext,
} from '../lib/guestSessionService';

export type GuestUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'email';
};

interface GuestAuthState {
  guest: GuestUser | null;
  isReady: boolean;
  lastError: string | null;
  /** Cloud guest_sessions row id while dine-in */
  activeSessionId: string | null;
  sessionContext: GuestSessionContext | null;

  initFromSupabase: () => Promise<void>;
  setSessionContext: (ctx: GuestSessionContext | null) => void;
  registerPresence: (ctx?: GuestSessionContext) => Promise<void>;
  signInWithGoogle: (redirectTo: string) => Promise<boolean>;
  signInWithGoogleProfile: (profile: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  }) => Promise<boolean>;
  continueWithEmail: (email: string, name?: string) => Promise<boolean>;
  sendMagicLink: (email: string, redirectTo: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

function displayNameFromEmail(email: string) {
  const local = email.split('@')[0] || 'Guest';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function sameSessionContext(
  a: GuestSessionContext | null | undefined,
  b: GuestSessionContext | null | undefined
) {
  return (
    (a?.outletId || null) === (b?.outletId || null) &&
    (a?.tableId || null) === (b?.tableId || null) &&
    (a?.tableNumber || null) === (b?.tableNumber || null) &&
    (a?.companyId || null) === (b?.companyId || null)
  );
}

async function publishPresence(
  guest: GuestUser,
  ctx: GuestSessionContext | null | undefined,
  set: (partial: Partial<GuestAuthState>) => void
) {
  if (!ctx?.tableId && !ctx?.outletId) return;
  const sessionId = await startGuestSession(guest, ctx || {});
  if (sessionId) set({ activeSessionId: sessionId, sessionContext: ctx || null });
}

export const useGuestAuthStore = create<GuestAuthState>()(
  persist(
    (set, get) => ({
      guest: null,
      isReady: false,
      lastError: null,
      activeSessionId: null,
      sessionContext: null,

      setSessionContext: (ctx) => set({ sessionContext: ctx }),

      registerPresence: async (ctx) => {
        const guest = get().guest;
        const context = ctx || get().sessionContext;
        if (!guest || !context) return;
        const currentSessionId = get().activeSessionId;

        if (currentSessionId && sameSessionContext(get().sessionContext, context)) {
          set({ sessionContext: context });
          await touchGuestSession(currentSessionId);
          return;
        }

        if (currentSessionId) {
          await endGuestSession({ sessionId: currentSessionId, email: guest.email });
          set({ activeSessionId: null });
        }

        await publishPresence(guest, context, set);
        const sid = get().activeSessionId;
        if (sid) void touchGuestSession(sid);
      },

      initFromSupabase: async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const user = data.session?.user;
          if (user?.email) {
            const guest: GuestUser = {
              id: user.id,
              email: user.email,
              name:
                (user.user_metadata?.full_name as string) ||
                (user.user_metadata?.name as string) ||
                displayNameFromEmail(user.email),
              avatarUrl: (user.user_metadata?.avatar_url as string) || undefined,
              provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
            };
            set({
              guest,
              isReady: true,
              lastError: null,
            });
            const ctx = get().sessionContext;
            if (ctx) void publishPresence(guest, ctx, set);
            return;
          }
        } catch {
          /* auth optional */
        }

        const guest = get().guest;
        if (guest?.provider === 'google') {
          await endGuestSession({ sessionId: get().activeSessionId, email: guest.email });
          set({ guest: null, activeSessionId: null, lastError: null, isReady: true });
          return;
        }

        set({ isReady: true });
      },

      signInWithGoogle: async (redirectTo) => {
        set({ lastError: null });
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              queryParams: { prompt: 'select_account' },
            },
          });
          if (error) throw error;
          return true;
        } catch (e: any) {
          set({
            lastError:
              e?.message ||
              'Google sign-in is not enabled. Enable Google under Supabase Auth → Providers, or continue with email.',
          });
          return false;
        }
      },

      signInWithGoogleProfile: async (profile) => {
        set({ lastError: null });
        const cleaned = profile.email?.trim().toLowerCase() || '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
          set({ lastError: 'Google sign-in did not return a valid email address.' });
          return false;
        }

        const guest: GuestUser = {
          id: profile.id?.trim() || `google-${cleaned}`,
          email: cleaned,
          name: profile.name?.trim() || displayNameFromEmail(cleaned),
          avatarUrl: profile.avatarUrl?.trim() || undefined,
          provider: 'google',
        };
        set({ guest, lastError: null });
        await publishPresence(guest, get().sessionContext, set);
        return true;
      },

      continueWithEmail: async (email, name) => {
        set({ lastError: null });
        const cleaned = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
          set({ lastError: 'Enter a valid email address' });
          return false;
        }
        const guest: GuestUser = {
          id: `email-${cleaned}`,
          email: cleaned,
          name: (name || '').trim() || displayNameFromEmail(cleaned),
          provider: 'email',
        };
        set({ guest, lastError: null });
        await publishPresence(guest, get().sessionContext, set);
        return true;
      },

      sendMagicLink: async (email, redirectTo) => {
        set({ lastError: null });
        const cleaned = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
          set({ lastError: 'Enter a valid email address' });
          return false;
        }
        try {
          const { error } = await supabase.auth.signInWithOtp({
            email: cleaned,
            options: { emailRedirectTo: redirectTo },
          });
          if (error) throw error;
        } catch {
          /* fall through to local guest */
        }
        const guest: GuestUser = {
          id: `email-${cleaned}`,
          email: cleaned,
          name: displayNameFromEmail(cleaned),
          provider: 'email',
        };
        set({ guest, lastError: null });
        await publishPresence(guest, get().sessionContext, set);
        return true;
      },

      signOut: async () => {
        const { activeSessionId, guest } = get();
        await endGuestSession({ sessionId: activeSessionId, email: guest?.email });
        try {
          await supabase.auth.signOut();
        } catch {
          /* ignore */
        }
        set({ guest: null, lastError: null, activeSessionId: null });
      },

      clearError: () => set({ lastError: null }),
    }),
    {
      name: 'cafepilots-guest-auth',
      partialize: (s) => ({ guest: s.guest, sessionContext: s.sessionContext }),
    }
  )
);
