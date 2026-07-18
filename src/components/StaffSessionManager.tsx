import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginPath } from '@/lib/appHost';
import { STAFF_ACTIVITY_TOUCH_MS } from '@/lib/staffSessionService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'focus'] as const;

export function StaffSessionManager() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const expireIfNeeded = () => {
      const auth = useAuthStore.getState();
      if (!auth.isSessionExpired()) return;
      useTenantStore.getState().clear();
      void auth.logout('expired').finally(() => {
        navigate(loginPath(), { replace: true });
      });
    };

    expireIfNeeded();
    const timer = window.setInterval(expireIfNeeded, 60_000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let lastTouch = 0;
    const markActivity = () => {
      const now = Date.now();
      if (now - lastTouch < STAFF_ACTIVITY_TOUCH_MS) return;
      lastTouch = now;

      const auth = useAuthStore.getState();
      if (auth.isSessionExpired()) return;
      auth.touchActivity();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', markActivity);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActivity);
      }
      document.removeEventListener('visibilitychange', markActivity);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const syncLogoutAcrossTabs = (event: StorageEvent) => {
      if (event.key !== 'auth-storage') return;
      try {
        const next = event.newValue ? JSON.parse(event.newValue) : null;
        if (next?.state?.isAuthenticated) return;
      } catch {
        /* treat unreadable auth storage as signed out */
      }

      useAuthStore.getState().clearAuth();
      useTenantStore.getState().clear();
      navigate(loginPath(), { replace: true });
    };

    window.addEventListener('storage', syncLogoutAcrossTabs);
    return () => window.removeEventListener('storage', syncLogoutAcrossTabs);
  }, [navigate]);

  return null;
}
