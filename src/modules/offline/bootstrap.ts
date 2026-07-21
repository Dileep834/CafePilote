import { SyncService } from './services/SyncService';
import { ConnectivityService } from './services/ConnectivityService';
import { CacheService } from './services/CacheService';
import { useTenantStore } from '@/store/useTenantStore';
import { isOfflineBillingAllowed } from './lib/capabilities';

let bootstrapped = false;

/**
 * Start connectivity monitoring + background sync for Pro/Enterprise offline POS.
 * Safe to call multiple times.
 */
export function bootstrapOfflinePos(): void {
  if (typeof window === 'undefined' || bootstrapped) return;
  bootstrapped = true;

  ConnectivityService.start();

  const planId = useTenantStore.getState().planId;
  if (!isOfflineBillingAllowed(planId)) {
    return;
  }

  SyncService.startBackground(30_000);

  window.addEventListener('cafepilots:connectivity', ((e: CustomEvent<{ online: boolean }>) => {
    if (e.detail?.online) {
      const tenant = useTenantStore.getState();
      void CacheService.refreshFromServer({
        outletId: tenant.activeOutletId,
        companyId: tenant.companyId,
      });
      void SyncService.run('internet_restored');
    }
  }) as EventListener);

  // Crash recovery: pending IndexedDB jobs survive refresh — kick sync if online
  if (ConnectivityService.isOnline()) {
    const tenant = useTenantStore.getState();
    void CacheService.refreshFromServer({
      outletId: tenant.activeOutletId,
      companyId: tenant.companyId,
    });
    void SyncService.run('interval');
  }
}
