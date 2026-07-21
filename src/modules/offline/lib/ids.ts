import { v4 as uuidv4 } from 'uuid';
import type { SyncableEntity, SyncStatus } from '../types/entities';

export function nowIso(): string {
  return new Date().toISOString();
}

export function newLocalId(): string {
  return uuidv4();
}

export function newClientUuid(): string {
  return uuidv4();
}

export function newRetryToken(): string {
  return uuidv4();
}

export function createSyncableBase(
  overrides?: Partial<SyncableEntity> & { sync_status?: SyncStatus }
): SyncableEntity {
  const id = overrides?.id || newLocalId();
  const ts = nowIso();
  return {
    id,
    local_id: overrides?.local_id || id,
    server_id: overrides?.server_id ?? null,
    sync_status: overrides?.sync_status || 'PENDING',
    created_at: overrides?.created_at || ts,
    updated_at: overrides?.updated_at || ts,
    version: overrides?.version ?? 1,
  };
}

/** Offline temporary order / invoice numbers: TMP-000001 */
export async function nextTempNumber(
  getMaxSeq: () => Promise<number>,
  prefix = 'TMP'
): Promise<string> {
  const next = (await getMaxSeq()) + 1;
  return `${prefix}-${String(next).padStart(6, '0')}`;
}

export function parseTempSeq(tempNumber: string | null | undefined): number {
  if (!tempNumber) return 0;
  const m = /^TMP-(\d+)$/i.exec(tempNumber.trim());
  return m ? parseInt(m[1], 10) : 0;
}

/** Exponential backoff: 10s, 30s, 1m, 5m, 15m, 1h (then clamp). */
export const RETRY_DELAYS_MS = [
  10_000,
  30_000,
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
] as const;

export function nextRetryAt(attempts: number, from = Date.now()): string {
  const idx = Math.min(Math.max(attempts, 0), RETRY_DELAYS_MS.length - 1);
  return new Date(from + RETRY_DELAYS_MS[idx]).toISOString();
}

export function bumpVersion<T extends SyncableEntity>(row: T, sync_status?: SyncStatus): T {
  return {
    ...row,
    version: row.version + 1,
    updated_at: nowIso(),
    ...(sync_status ? { sync_status } : {}),
  };
}
