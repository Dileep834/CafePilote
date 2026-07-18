import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

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

  initFromSupabase: () => Promise<void>;
  signInWithGoogle: (redirectTo: string) => Promise<boolean>;
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

export const useGuestAuthStore = create<GuestAuthState>()(
  persist(
    (set) => ({
      guest: null,
      isReady: false,
      lastError: null,

      initFromSupabase: async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const user = data.session?.user;
          if (user?.email) {
            set({
              guest: {
                id: user.id,
                email: user.email,
                name:
                  (user.user_metadata?.full_name as string) ||
                  (user.user_metadata?.name as string) ||
                  displayNameFromEmail(user.email),
                avatarUrl: (user.user_metadata?.avatar_url as string) || undefined,
                provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
              },
              isReady: true,
              lastError: null,
            });
            return;
          }
        } catch {
          /* auth optional */
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
          // Also set local session so they can browse immediately after OTP request
          set({
            guest: {
              id: `email-${cleaned}`,
              email: cleaned,
              name: displayNameFromEmail(cleaned),
              provider: 'email',
            },
          });
          return true;
        } catch (e: any) {
          // Fall back to local email continue
          set({
            guest: {
              id: `email-${cleaned}`,
              email: cleaned,
              name: displayNameFromEmail(cleaned),
              provider: 'email',
            },
            lastError: null,
          });
          return true;
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          /* ignore */
        }
        set({ guest: null, lastError: null });
      },

      clearError: () => set({ lastError: null }),
    }),
    {
      name: 'cafepilots-guest-auth',
      partialize: (s) => ({ guest: s.guest }),
    }
  )
);
