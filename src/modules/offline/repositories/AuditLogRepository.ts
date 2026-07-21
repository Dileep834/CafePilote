import { getOfflineDB } from '../db/CafePilotsOfflineDB';
import type { LocalAuditLog } from '../types/entities';
import { createSyncableBase } from '../lib/ids';

export type AuditEventType =
  | 'OfflineLogin'
  | 'OfflineCheckout'
  | 'OfflineRefund'
  | 'OfflineInventory'
  | 'SyncStart'
  | 'SyncSuccess'
  | 'SyncFailure'
  | 'Conflict'
  | 'ManagerOverride'
  | 'OfflineKot'
  | 'ConnectivityChange';

export const AuditLogRepository = {
  async write(input: {
    event_type: AuditEventType | string;
    message: string;
    actor_id?: string | null;
    outlet_id?: string | null;
    meta?: Record<string, unknown> | null;
  }): Promise<LocalAuditLog> {
    const row: LocalAuditLog = {
      ...createSyncableBase({ sync_status: 'PENDING' }),
      event_type: input.event_type,
      actor_id: input.actor_id ?? null,
      outlet_id: input.outlet_id ?? null,
      message: input.message,
      meta: input.meta ?? null,
    };
    await getOfflineDB().audit_logs.put(row);
    return row;
  },

  async recent(limit = 100): Promise<LocalAuditLog[]> {
    return getOfflineDB().audit_logs.orderBy('created_at').reverse().limit(limit).toArray();
  },
};
