import { OfflineInventoryRepository } from '../repositories/OfflineInventoryRepository';
import { ConnectivityService } from './ConnectivityService';

/**
 * InventoryService — local snapshot + queue; online deduction stays in recipeDeductionService.
 * Offline mode reduces locally and enqueues sync jobs (no duplicated BOM math here).
 */
export const InventoryService = {
  async getLocalStock(outletId: string, productId: string): Promise<number> {
    const snap = await OfflineInventoryRepository.getSnapshot(outletId);
    return snap[productId] ?? 0;
  },

  async replaceSnapshot(outletId: string, map: Record<string, number>): Promise<void> {
    await OfflineInventoryRepository.putSnapshot(outletId, map);
  },

  async deductLocal(input: {
    outletId: string;
    productId: string;
    quantity: number;
    orderLocalId?: string | null;
    strict?: boolean;
  }) {
    return OfflineInventoryRepository.applyLocalDelta({
      outletId: input.outletId,
      productId: input.productId,
      delta: -Math.abs(input.quantity),
      movementType: 'sale',
      orderLocalId: input.orderLocalId,
      strict: input.strict,
    });
  },

  isOnline(): boolean {
    return ConnectivityService.isOnline();
  },
};
