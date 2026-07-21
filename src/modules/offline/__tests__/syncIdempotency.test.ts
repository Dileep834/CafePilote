import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetOfflineDBForTests } from '../db/CafePilotsOfflineDB';
import { OfflineOrderRepository } from '../repositories/OfflineOrderRepository';
import { SyncQueueRepository } from '../repositories/SyncQueueRepository';

const createCompletedOrder = vi.fn();

vi.mock('../repositories/OnlineOrderRepository', () => ({
  OnlineOrderRepository: {
    createCompletedOrder: (...args: unknown[]) => createCompletedOrder(...args),
    insertKitchenTicket: vi.fn(),
  },
}));

vi.mock('@/modules/ops/services/paymentIntentService', () => ({
  createOrGetPaymentIntent: vi.fn(async () => ({ intent: { id: 'local-x' }, reused: false })),
  completePaymentIntent: vi.fn(),
}));

vi.mock('@/modules/ops/services/inventoryLedgerService', () => ({
  applyInventoryDelta: vi.fn(async () => ({ productId: 'p1', before: 10, after: 9, delta: -1 })),
}));

describe('Sync engine idempotency', () => {
  beforeEach(async () => {
    createCompletedOrder.mockReset();
    const db = resetOfflineDBForTests(`sync_${Math.random().toString(36).slice(2)}`);
    await db.open();
  });

  it('duplicate CreateOrder upload reuses server id via repository', async () => {
    const local = await OfflineOrderRepository.createPaidOrder({
      outletId: 'o1',
      totalAmount: 20,
      taxAmount: 0,
      discountAmount: 0,
      paymentMethod: 'cash',
      tenderedAmount: 20,
      changeDue: 0,
      idempotencyKey: 'sync-idem-1',
      lines: [{ productId: 'p1', name: 'Bun', quantity: 1, unitPrice: 20 }],
    });

    createCompletedOrder.mockResolvedValueOnce({
      orderId: 'srv-1',
      reused: false,
      orderNumber: 'ORD-2026-000501',
      raw: {},
    });

    const { SyncService } = await import('../services/SyncService');
    // Force online
    const { useConnectivityStore } = await import('../services/ConnectivityService');
    useConnectivityStore.getState().setState({
      online: true,
      quality: 'good',
      state: 'Online',
      latencyMs: 10,
      lastCheckedAt: new Date().toISOString(),
      lastError: null,
    });

    const first = await SyncService.run('manual');
    expect(first.succeeded).toBeGreaterThanOrEqual(1);

    // Simulate requeue of CreateOrder after already synced
    const jobs = await SyncQueueRepository.listByState(['Success']);
    const orderJob = jobs.find((j) => j.job_type === 'CreateOrder');
    expect(orderJob).toBeTruthy();

    createCompletedOrder.mockResolvedValueOnce({
      orderId: 'srv-1',
      reused: true,
      orderNumber: 'ORD-2026-000501',
      raw: {},
    });

    await SyncQueueRepository.requeue(orderJob!.id);
    const second = await SyncService.run('manual');
    expect(second.succeeded).toBeGreaterThanOrEqual(1);

    const order = await OfflineOrderRepository.getByLocalId(local.order.local_id);
    expect(order?.server_id).toBe('srv-1');
    // Same client uuid always sent
    expect(createCompletedOrder.mock.calls[0][0].clientUuid).toBe(local.order.client_uuid);
  });
});
