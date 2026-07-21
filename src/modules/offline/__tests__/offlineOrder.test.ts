import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetOfflineDBForTests } from '../db/CafePilotsOfflineDB';
import { OfflineOrderRepository } from '../repositories/OfflineOrderRepository';
import { SyncQueueRepository } from '../repositories/SyncQueueRepository';
import { nextRetryAt, RETRY_DELAYS_MS, parseTempSeq } from '../lib/ids';
import { paymentMethodAvailableOffline, resolveOfflinePaymentPolicy } from '../lib/capabilities';
import { ConflictResolver } from '../services/ConflictResolver';

vi.mock('@/modules/saas/services/featureFlagService', () => ({
  useFeatureFlagStore: {
    getState: () => ({
      flags: { 'offline.billing': true },
      isEnabled: (_k: string, fallback = false) => true || fallback,
      setLocal: () => undefined,
      hydrate: async () => undefined,
    }),
  },
}));

describe('Offline order durability', () => {
  beforeEach(async () => {
    const db = resetOfflineDBForTests(`test_${Math.random().toString(36).slice(2)}`);
    await db.open();
  });

  it('saves order locally with TMP number and PENDING sync jobs', async () => {
    const result = await OfflineOrderRepository.createPaidOrder({
      outletId: 'outlet-1',
      totalAmount: 100,
      taxAmount: 5,
      discountAmount: 0,
      paymentMethod: 'cash',
      tenderedAmount: 100,
      changeDue: 0,
      idempotencyKey: 'idem-1',
      lines: [{ productId: 'p1', name: 'Latte', quantity: 1, unitPrice: 100 }],
    });

    expect(result.order.temp_order_number).toMatch(/^TMP-\d{6}$/);
    expect(result.order.sync_status).toBe('PENDING');
    expect(result.payment.sync_status).toBe('PENDING');
    expect(result.items).toHaveLength(1);

    const pending = await SyncQueueRepository.listByState(['Pending']);
    expect(pending.some((j) => j.job_type === 'CreateOrder')).toBe(true);
    expect(pending.some((j) => j.job_type === 'CreatePayment')).toBe(true);

    const payJob = pending.find((j) => j.job_type === 'CreatePayment')!;
    expect(payJob.depends_on.length).toBe(1);
  });

  it('idempotent replay does not create duplicate local orders', async () => {
    const key = 'idem-dup';
    const a = await OfflineOrderRepository.createPaidOrder({
      outletId: 'outlet-1',
      totalAmount: 50,
      taxAmount: 0,
      discountAmount: 0,
      paymentMethod: 'cash',
      tenderedAmount: 50,
      changeDue: 0,
      idempotencyKey: key,
      lines: [{ productId: 'p1', name: 'Tea', quantity: 1, unitPrice: 50 }],
    });
    const b = await OfflineOrderRepository.createPaidOrder({
      outletId: 'outlet-1',
      totalAmount: 50,
      taxAmount: 0,
      discountAmount: 0,
      paymentMethod: 'cash',
      tenderedAmount: 50,
      changeDue: 0,
      idempotencyKey: key,
      lines: [{ productId: 'p1', name: 'Tea', quantity: 1, unitPrice: 50 }],
    });
    expect(a.order.local_id).toBe(b.order.local_id);
    expect(b.createOrderJobId).toBe('');
  });

  it('keeps printed temp number after markSynced', async () => {
    const result = await OfflineOrderRepository.createPaidOrder({
      outletId: 'outlet-1',
      totalAmount: 10,
      taxAmount: 0,
      discountAmount: 0,
      paymentMethod: 'cash',
      tenderedAmount: 10,
      changeDue: 0,
      idempotencyKey: 'idem-sync',
      lines: [{ productId: 'p1', name: 'Water', quantity: 1, unitPrice: 10 }],
    });
    const temp = result.order.temp_order_number;
    await OfflineOrderRepository.markSynced(result.order.local_id, 'server-ord-1', 'ORD-2026-000501');
    const updated = await OfflineOrderRepository.getByLocalId(result.order.local_id);
    expect(updated?.sync_status).toBe('SYNCED');
    expect(updated?.server_order_number).toBe('ORD-2026-000501');
    expect(updated?.payload.printedReceiptOrderNumber).toBe(temp);
    expect(updated?.temp_order_number).toBe(temp);
  });
});

describe('Retry policy', () => {
  it('uses exponential backoff schedule', () => {
    expect(RETRY_DELAYS_MS[0]).toBe(10_000);
    expect(RETRY_DELAYS_MS[5]).toBe(3_600_000);
    const t0 = Date.parse(nextRetryAt(0, 0));
    const t5 = Date.parse(nextRetryAt(5, 0));
    expect(t0).toBe(10_000);
    expect(t5).toBe(3_600_000);
  });

  it('parses TMP sequence', () => {
    expect(parseTempSeq('TMP-000042')).toBe(42);
  });
});

describe('Offline payments', () => {
  it('allows cash offline and blocks UPI by default', () => {
    const policy = resolveOfflinePaymentPolicy(false);
    expect(paymentMethodAvailableOffline('cash', policy).ok).toBe(true);
    expect(paymentMethodAvailableOffline('upi', policy).ok).toBe(false);
  });
});

describe('Conflict resolver', () => {
  it('does not auto-overwrite inventory conflicts', async () => {
    const conflict = ConflictResolver.detect(
      {
        id: 'j1',
        local_id: 'j1',
        server_id: null,
        sync_status: 'CONFLICT',
        created_at: '',
        updated_at: '',
        version: 1,
        job_type: 'Inventory',
        state: 'Conflict',
        entity_local_id: 'x',
        entity_table: 'inventory_transactions',
        client_uuid: 'c',
        retry_token: 'r',
        attempts: 1,
        next_retry_at: null,
        last_error: 'inventory mismatch',
        depends_on: [],
        payload: {},
        priority: 1,
      },
      new Error('inventory mismatch on product')
    );
    expect(conflict?.kind).toBe('inventory_mismatch');
    const auto = await ConflictResolver.resolveAutomatically(conflict!);
    expect(auto).toBeNull();
  });
});
