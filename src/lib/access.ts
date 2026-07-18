import type { User } from '@/types';
import { Role } from '@/constants';

/** Platform owner — full app management access */
export function isSuperAdmin(user?: User | null): boolean {
  return user?.role === Role.SUPER_ADMIN || user?.role === 'Super Admin';
}

/** Super Admin or tenant Admin */
export function isPlatformAdmin(user?: User | null): boolean {
  return isSuperAdmin(user) || user?.role === Role.ADMIN || user?.role === 'Admin';
}

/**
 * Whether queries should skip company_id filtering.
 * Super Admin owns the platform and sees all tenants.
 */
export function shouldBypassCompanyScope(user?: User | null): boolean {
  return isSuperAdmin(user);
}
