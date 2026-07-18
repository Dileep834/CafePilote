import React, { useEffect, useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { APP_NAME, APP_TAGLINE, BRAND } from '@/constants';
import { useGuestAuthStore } from '../store/useGuestAuthStore';
import type { Table } from '@/types';

type Props = {
  table: Table;
  redirectTo: string;
  onSignedIn: () => void;
};

export function GuestLogin({ table, redirectTo, onSignedIn }: Props) {
  const {
    guest,
    lastError,
    initFromSupabase,
    signInWithGoogle,
    continueWithEmail,
    clearError,
  } = useGuestAuthStore();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);

  useEffect(() => {
    void initFromSupabase();
  }, [initFromSupabase]);

  useEffect(() => {
    if (guest) onSignedIn();
  }, [guest, onSignedIn]);

  const handleGoogle = async () => {
    clearError();
    setBusy('google');
    await signInWithGoogle(redirectTo);
    setBusy(null);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setBusy('email');
    const ok = await continueWithEmail(email, name);
    setBusy(null);
    if (ok) onSignedIn();
  };

  return (
    <div
      className="min-h-full flex flex-col px-5 pt-10 pb-8"
      style={{ background: `linear-gradient(165deg, ${BRAND.gray} 0%, #fff 55%, ${BRAND.cream}55 100%)` }}
    >
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        <div className="mb-8">
          <CafePilotsLogo size={44} withWordmark withDivider />
          <p className="text-xs text-slate-400 mt-3">{APP_TAGLINE}</p>
        </div>

        <div
          className="rounded-3xl border border-slate-200/80 bg-white/90 shadow-lg p-6 space-y-5"
          style={{ boxShadow: '0 16px 40px rgba(13,27,42,0.08)' }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Table {table.tableNumber}</p>
            <h1 className="text-2xl font-bold tracking-tight mt-1" style={{ color: BRAND.navy }}>
              Sign in to order
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              One-tap Google or your email — so we can track your order status at the table.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy !== null}
            className="w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-800 flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
          >
            {busy === 'google' ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">or email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20"
                />
              </div>
            </div>

            {lastError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{lastError}</p>
            )}

            <button
              type="submit"
              disabled={busy !== null || !email.trim()}
              className="w-full h-12 rounded-xl text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: BRAND.orange }}
            >
              {busy === 'email' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Continue with email
            </button>
          </form>
        </div>

        <p className="text-[11px] text-center text-slate-400 mt-6 px-4">
          By continuing you agree to receive order updates for this {APP_NAME} dine-in session.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.3 44 32 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}
