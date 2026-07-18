import type { User } from '@/types';
import { BRANCH_SWITCH_ROLES, Role } from '@/constants';

/** Platform owner — full app management access */
export function isSuperAdmin(user?: User | null): boolean {
  return user?.role === Role.SUPER_ADMIN || user?.role === 'Super Admin';
}

/** Super Admin or tenant Admin */
export function isPlatformAdmin(user?: User | null): boolean {
  return isSuperAdmin(user) || user?.role === Role.ADMIN || user?.role === 'Admin';
}

/** Roles trusted to operate across outlets within the current company */
export function canSwitchBranchesByRole(user?: User | null): boolean {
  return Boolean(user?.role && BRANCH_SWITCH_ROLES.includes(user.role));
}

/**
 * Whether queries should skip company_id filtering.
 * Super Admin owns the platform and sees all tenants.
 */
export function shouldBypassCompanyScope(user?: User | null): boolean {
  return isSuperAdmin(user);
}
