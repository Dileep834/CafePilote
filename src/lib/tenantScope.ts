import type { User } from '@/types';
import { HQ_COMPANY_ID } from '@/constants';
import { isSuperAdmin } from '@/lib/access';
import { useTenantStore } from '@/store/useTenantStore';

/**
 * Company id for data queries.
 * Super Admin: active branch's company (so switching to a Backbenchers
 * outlet does not mix HQ catalog into that branch, and vice versa).
 * Everyone else: their tenant company only.
 */
export function getScopedCompanyId(user?: User | null): string {
  const tenant = useTenantStore.getState();
  if (isSuperAdmin(user)) {
    const active = tenant.outlets.find((o) => o.id === tenant.activeOutletId);
    if (active?.companyId) return String(active.companyId);
    return tenant.companyId || HQ_COMPANY_ID;
  }
  return (
    tenant.companyId ||
    user?.companyId ||
    HQ_COMPANY_ID
  );
}

/** Outlet ids that belong to a company (from hydrated tenant list). */
export function getOutletIdsForCompany(companyId: string): string[] {
  return useTenantStore
    .getState()
    .outlets.filter((o) => String(o.companyId) === String(companyId))
    .map((o) => o.id);
}
