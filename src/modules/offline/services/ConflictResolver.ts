import type { SyncQueueJob } from '../types/entities';
import { AuditLogRepository } from '../repositories/AuditLogRepository';

export type ConflictKind =
  | 'inventory_mismatch'
  | 'deleted_product'
  | 'changed_price'
  | 'duplicate_customer'
  | 'changed_tax'
  | 'deleted_recipe'
  | 'unknown';

export type ConflictRecord = {
  id: string;
  kind: ConflictKind;
  jobId: string;
  message: string;
  localSnapshot: unknown;
  serverSnapshot: unknown;
  requiresManager: boolean;
  createdAt: string;
};

export type ConflictResolution =
  | { action: 'auto_keep_server' }
  | { action: 'auto_merge' }
  | { action: 'manual'; preferred: 'local' | 'server' }
  | { action: 'manager_approval'; approvedBy: string; preferred: 'local' | 'server' };

/**
 * Never silently overwrite server data.
 * Automatic resolutions only when safe and explicit.
 */
export const ConflictResolver = {
  detect(job: SyncQueueJob, error: unknown): ConflictRecord | null {
    const msg = error instanceof Error ? error.message : String(error || '');
    let kind: ConflictKind = 'unknown';
    if (/inventory|stock/i.test(msg)) kind = 'inventory_mismatch';
    else if (/product.*(delete|missing|not found)/i.test(msg)) kind = 'deleted_product';
    else if (/price/i.test(msg)) kind = 'changed_price';
    else if (/customer.*dup/i.test(msg)) kind = 'duplicate_customer';
    else if (/tax/i.test(msg)) kind = 'changed_tax';
    else if (/recipe/i.test(msg)) kind = 'deleted_recipe';
    else if (!/conflict/i.test(msg)) return null;

    return {
      id: `conflict-${job.id}`,
      kind,
      jobId: job.id,
      message: msg,
      localSnapshot: job.payload,
      serverSnapshot: null,
      requiresManager: kind === 'inventory_mismatch' || kind === 'changed_price' || kind === 'changed_tax',
      createdAt: new Date().toISOString(),
    };
  },

  async resolveAutomatically(conflict: ConflictRecord): Promise<ConflictResolution | null> {
    // Safe auto rules only — never invent stock or prices.
    if (conflict.kind === 'duplicate_customer') {
      return { action: 'auto_keep_server' };
    }
    if (conflict.kind === 'deleted_product') {
      // Keep local sale history; map product as unknown on server — needs manual review
      return null;
    }
    return null;
  },

  async apply(
    conflict: ConflictRecord,
    resolution: ConflictResolution
  ): Promise<{ ok: boolean; message: string }> {
    if (resolution.action === 'auto_keep_server') {
      await AuditLogRepository.write({
        event_type: 'Conflict',
        message: `Auto-resolved conflict ${conflict.id} → keep server`,
        meta: { conflict, resolution },
      });
      return { ok: true, message: 'Kept server data' };
    }
    if (resolution.action === 'auto_merge') {
      await AuditLogRepository.write({
        event_type: 'Conflict',
        message: `Auto-merged conflict ${conflict.id}`,
        meta: { conflict, resolution },
      });
      return { ok: true, message: 'Merged' };
    }
    if (resolution.action === 'manager_approval') {
      await AuditLogRepository.write({
        event_type: 'ManagerOverride',
        message: `Manager ${resolution.approvedBy} resolved conflict ${conflict.id} → ${resolution.preferred}`,
        meta: { conflict, resolution },
      });
      return { ok: true, message: `Manager chose ${resolution.preferred}` };
    }
    await AuditLogRepository.write({
      event_type: 'Conflict',
      message: `Manual conflict resolution ${conflict.id} → ${resolution.preferred}`,
      meta: { conflict, resolution },
    });
    return { ok: true, message: `Manual: ${resolution.preferred}` };
  },
};
