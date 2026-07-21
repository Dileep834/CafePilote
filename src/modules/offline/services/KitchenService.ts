import { OfflineKitchenRepository } from '../repositories/OfflineInventoryRepository';
import { OnlineOrderRepository } from '../repositories/OnlineOrderRepository';
import { ConnectivityService } from './ConnectivityService';
import { newClientUuid, newRetryToken } from '../lib/ids';
import { SyncService } from './SyncService';

export type KitchenTicketInput = {
  outletId: string | null;
  orderLocalId?: string;
  tableId?: string | null;
  tableNumber?: string | null;
  customerName?: string | null;
  notes?: string | null;
  idempotencyKey: string;
  items: Array<{
    productId: string | null;
    productName: string;
    quantity: number;
    unitPrice?: number;
    notes?: string | null;
  }>;
  /** Called by UI after local print — never blocks cashier */
  onPrinted?: () => void;
};

/**
 * KitchenService — offline KOT never lost; prints locally, syncs when online.
 */
export const KitchenService = {
  async sendTicket(input: KitchenTicketInput): Promise<{
    mode: 'online' | 'offline';
    id: string;
  }> {
    if (ConnectivityService.isOnline()) {
      const result = await OnlineOrderRepository.insertKitchenTicket({
        outletId: input.outletId,
        tableId: input.tableId,
        tableNumber: input.tableNumber,
        customerName: input.customerName,
        notes: input.notes,
        clientUuid: newClientUuid(),
        retryToken: newRetryToken(),
        idempotencyKey: input.idempotencyKey,
        lines: input.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice ?? 0,
          totalPrice: (i.unitPrice ?? 0) * i.quantity,
        })),
      });
      input.onPrinted?.();
      return { mode: 'online', id: result.orderId };
    }

    const kot = await OfflineKitchenRepository.enqueueKot({
      outletId: input.outletId,
      orderLocalId: input.orderLocalId || `orphan-${Date.now()}`,
      tableId: input.tableId,
      tableNumber: input.tableNumber,
      items: input.items.map((i) => ({
        product_id: i.productId,
        product_name: i.productName,
        quantity: i.quantity,
        notes: i.notes,
      })),
    });
    await OfflineKitchenRepository.markPrinted(kot.local_id);
    input.onPrinted?.();
    void SyncService.run('interval');
    return { mode: 'offline', id: kot.local_id };
  },

  async listLocalPending() {
    return OfflineKitchenRepository.listPending();
  },
};
