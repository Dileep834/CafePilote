import { ConnectivityService } from './ConnectivityService';
import {
  isOfflineBillingAllowed,
  paymentMethodAvailableOffline,
  resolveOfflinePaymentPolicy,
} from '../lib/capabilities';
import {
  OfflineOrderRepository,
  type OfflineCheckoutInput,
  type OfflineCheckoutResult,
} from '../repositories/OfflineOrderRepository';
import { OnlineOrderRepository, type OnlineOrderWriteInput } from '../repositories/OnlineOrderRepository';
import { OfflineInventoryRepository } from '../repositories/OfflineInventoryRepository';
import { OfflineKitchenRepository } from '../repositories/OfflineInventoryRepository';
import { SyncService } from './SyncService';
import { newClientUuid, newRetryToken } from '../lib/ids';
import { useTenantStore } from '@/store/useTenantStore';

export type OrderServiceCheckoutInput = OfflineCheckoutInput & {
  /** When true, prefer direct online write even if offline path exists. */
  forceOnline?: boolean;
  /** Strict local inventory block when offline. */
  strictInventory?: boolean;
  /** Fire local KOT after save (walk-in). Default true when no table. */
  fireKot?: boolean;
  paymentIntentId?: string | null;
};

export type OrderServiceCheckoutResult =
  | {
      mode: 'online';
      orderId: string;
      orderNumber: string | null;
      reused: boolean;
      tempOrderNumber?: undefined;
    }
  | {
      mode: 'offline';
      orderId: string;
      orderNumber: string;
      tempOrderNumber: string;
      tempInvoiceNumber: string;
      local: OfflineCheckoutResult;
      reused: boolean;
    };

/**
 * OrderService — single business entry for paid sales.
 * UI must not call Supabase; online and offline share this service.
 */
export const OrderService = {
  async checkout(input: OrderServiceCheckoutInput): Promise<OrderServiceCheckoutResult> {
    const planId = useTenantStore.getState().planId;
    const online = ConnectivityService.isOnline();
    const offlineOk = isOfflineBillingAllowed(planId);

    const policy = resolveOfflinePaymentPolicy(online);
    const payCheck = paymentMethodAvailableOffline(input.paymentMethod, policy);
    if (!online && !payCheck.ok) {
      throw new Error(payCheck.warning || 'Payment method unavailable offline');
    }

    const useOnline = online || input.forceOnline;
    if (useOnline) {
      if (!online && input.forceOnline) {
        throw new Error('Cannot force online checkout while offline');
      }
      return this.checkoutOnline(input);
    }

    if (!offlineOk) {
      throw new Error(
        'Offline billing is not enabled for this plan. Reconnect or upgrade to Professional/Enterprise.'
      );
    }

    return this.checkoutOffline(input);
  },

  async checkoutOnline(input: OrderServiceCheckoutInput): Promise<OrderServiceCheckoutResult> {
    const write: OnlineOrderWriteInput = {
      outletId: input.outletId,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      totalAmount: input.totalAmount,
      taxAmount: input.taxAmount,
      paymentMethod: input.paymentMethod,
      tenderedAmount: input.tenderedAmount,
      changeDue: input.changeDue,
      kitchenStatus: input.kitchenStatus || (input.tableId ? 'delivered' : 'pending'),
      tableId: input.tableId,
      tableNumber: input.tableNumber,
      orderSource: input.orderSource,
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
      paymentIntentId: input.paymentIntentId,
      clientUuid: newClientUuid(),
      retryToken: newRetryToken(),
      lines: input.lines.map((l) => ({
        productId: l.productId,
        productName: l.notes ? `${l.name} (${l.notes})` : l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.unitPrice * l.quantity,
      })),
    };

    const result = await OnlineOrderRepository.createCompletedOrder(write);
    return {
      mode: 'online',
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      reused: result.reused,
    };
  },

  async checkoutOffline(input: OrderServiceCheckoutInput): Promise<OrderServiceCheckoutResult> {
    if (input.outletId && input.strictInventory) {
      for (const line of input.lines) {
        if (!line.productId) continue;
        const snap = await OfflineInventoryRepository.getSnapshot(input.outletId);
        const qty = snap[line.productId] ?? 0;
        if (qty < line.quantity) {
          throw new Error(`Insufficient local stock for ${line.name}`);
        }
      }
    }

    const local = await OfflineOrderRepository.createPaidOrder(input);

    if (input.outletId) {
      for (const line of input.lines) {
        if (!line.productId) continue;
        await OfflineInventoryRepository.applyLocalDelta({
          outletId: input.outletId,
          productId: line.productId,
          delta: -line.quantity,
          movementType: 'sale',
          orderLocalId: local.order.local_id,
          strict: Boolean(input.strictInventory),
        });
      }
    }

    if (input.fireKot !== false && !input.tableId) {
      await OfflineKitchenRepository.enqueueKot({
        outletId: input.outletId,
        orderLocalId: local.order.local_id,
        tableId: input.tableId,
        tableNumber: input.tableNumber,
        items: input.lines.map((l) => ({
          product_id: l.productId,
          product_name: l.name,
          quantity: l.quantity,
          notes: l.notes,
        })),
      });
    }

    void SyncService.run('interval');

    return {
      mode: 'offline',
      orderId: local.order.local_id,
      orderNumber: local.order.temp_order_number,
      tempOrderNumber: local.order.temp_order_number,
      tempInvoiceNumber: local.order.temp_invoice_number,
      local,
      reused: !local.createOrderJobId,
    };
  },
};
