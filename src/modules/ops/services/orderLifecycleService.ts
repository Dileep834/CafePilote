import { supabase } from '@/lib/supabase';
import { writeAuditLog } from '@/modules/ops/services/auditService';
import { pushAppNotification } from '@/modules/ops/services/notificationService';

/** Canonical restaurant order lifecycle (Phase 2) */
export type OrderLifecycleStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'archived'
  | 'cancelled'
  | 'rejected'
  | 'expired';

export type OrderChannel =
  | 'dine_in'
  | 'takeaway'
  | 'delivery'
  | 'qr'
  | 'website'
  | 'swiggy'
  | 'zomato'
  | 'ondc'
  | 'phone'
  | 'whatsapp'
  | 'pos'
  | 'walk_in';

const ALLOWED: Record<string, OrderLifecycleStatus[]> = {
  new: ['accepted', 'rejected', 'cancelled', 'expired'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'completed', 'cancelled'],
  served: ['completed'],
  completed: ['archived'],
  archived: [],
  cancelled: [],
  rejected: [],
  expired: [],
};

/** Map kitchen_status ↔ lifecycle */
export function kitchenToLifecycle(kitchen: string | null | undefined): OrderLifecycleStatus {
  switch (kitchen) {
    case 'pending':
      return 'accepted';
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'delivered':
      return 'served';
    default:
      return 'new';
  }
}

export function lifecycleToKitchen(life: OrderLifecycleStatus): string | null {
  switch (life) {
    case 'accepted':
      return 'pending';
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'served':
    case 'completed':
      return 'delivered';
    default:
      return null;
  }
}

export async function recordLifecycleTransition(params: {
  orderId: string;
  outletId?: string | null;
  channel?: OrderChannel | string | null;
  fromStatus?: string | null;
  toStatus: OrderLifecycleStatus | string;
  actorId?: string | null;
  actorName?: string | null;
  meta?: Record<string, unknown>;
  startedAt?: string | null;
}): Promise<void> {
  const durationSeconds = params.startedAt
    ? Math.max(0, Math.round((Date.now() - new Date(params.startedAt).getTime()) / 1000))
    : null;

  try {
    await supabase.from('order_lifecycle_events').insert([
      {
        order_id: params.orderId,
        outlet_id: params.outletId || null,
        channel: params.channel || null,
        from_status: params.fromStatus || null,
        to_status: params.toStatus,
        actor_id: params.actorId || null,
        actor_name: params.actorName || null,
        duration_seconds: durationSeconds,
        meta: params.meta || null,
      },
    ]);
  } catch (err) {
    console.warn('[lifecycle] event insert skipped', err);
  }

  // Best-effort column updates on pos_orders
  try {
    const patch: Record<string, unknown> = {
      lifecycle_status: params.toStatus,
    };
    const now = new Date().toISOString();
    if (params.toStatus === 'accepted') patch.accepted_at = now;
    if (params.toStatus === 'preparing') patch.preparing_at = now;
    if (params.toStatus === 'ready') patch.ready_at = now;
    if (params.toStatus === 'served') patch.served_at = now;
    if (params.toStatus === 'completed') patch.completed_at = now;

    const kitchen = lifecycleToKitchen(params.toStatus as OrderLifecycleStatus);
    if (kitchen) patch.kitchen_status = kitchen;

    await supabase.from('pos_orders').update(patch).eq('id', params.orderId);
  } catch {
    /* columns may not exist yet */
  }

  await writeAuditLog({
    outletId: params.outletId,
    userId: params.actorId,
    userName: params.actorName,
    action: 'checkout',
    entityType: 'order_lifecycle',
    entityId: params.orderId,
    oldValue: { status: params.fromStatus },
    newValue: { status: params.toStatus, durationSeconds },
  });
}

export function canTransition(
  from: OrderLifecycleStatus | string,
  to: OrderLifecycleStatus | string
): boolean {
  const allowed = ALLOWED[from] || [];
  return allowed.includes(to as OrderLifecycleStatus);
}

export async function transitionOrder(params: {
  orderId: string;
  fromStatus: OrderLifecycleStatus | string;
  toStatus: OrderLifecycleStatus;
  outletId?: string | null;
  channel?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  notify?: boolean;
}): Promise<{ ok: boolean; message?: string }> {
  if (!canTransition(params.fromStatus, params.toStatus)) {
    return { ok: false, message: `Invalid transition ${params.fromStatus} → ${params.toStatus}` };
  }

  await recordLifecycleTransition({
    orderId: params.orderId,
    outletId: params.outletId,
    channel: params.channel,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    actorId: params.actorId,
    actorName: params.actorName,
  });

  if (params.notify !== false) {
    await pushAppNotification({
      outletId: params.outletId,
      kind: `order_${params.toStatus}`,
      title: `Order ${params.toStatus}`,
      body: `#${params.orderId.slice(0, 8)} → ${params.toStatus}`,
      entityType: 'pos_order',
      entityId: params.orderId,
      severity: params.toStatus === 'cancelled' ? 'warn' : 'info',
    });
  }

  return { ok: true };
}
