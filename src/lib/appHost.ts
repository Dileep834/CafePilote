import { APP_DOMAIN } from '@/constants';

/** True when this SPA is served on the staff-app hostname. */
export function isAppHost(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  const host = hostname.toLowerCase().split(':')[0];
  if (!host) return false;
  if (host === `app.${APP_DOMAIN}`) return true;
  // Local / preview helpers
  if (host === 'app.localhost' || host === 'app.127.0.0.1') return true;
  if (host.startsWith('app.') && host.endsWith('.localhost')) return true;
  return false;
}

/** Staff login path — `/` on app subdomain, `/app` on marketing site. */
export function loginPath(hostname?: string): string {
  return isAppHost(hostname) ? '/' : '/app';
}

/** Marketing site home — only meaningful on apex/www. */
export function marketingHomePath(): string {
  return '/';
}

export function isMarketingHost(hostname?: string): boolean {
  return !isAppHost(hostname);
}
