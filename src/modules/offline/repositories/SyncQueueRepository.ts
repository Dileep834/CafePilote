import { getOfflineDB } from '../db/CafePilotsOfflineDB';
import type { SyncJobType, SyncQueueJob } from '../types/entities';
import { createSyncableBase, newClientUuid, newRetryToken, nextRetryAt, nowIso } from '../lib/ids';

export type EnqueueInput = {
  job_type: SyncJobType;
  entity_local_id: string;
  entity_table: string;
  payload: Record<string, unknown>;
  depends_on?: string[];
  priority?: number;
  client_uuid?: string;
  retry_token?: string;
};

export const SyncQueueRepository = {
  async enqueue(input: EnqueueInput): Promise<SyncQueueJob> {
    const db = getOfflineDB();
    const base = createSyncableBase({ sync_status: 'PENDING' });
    const job: SyncQueueJob = {
      ...base,
      job_type: input.job_type,
      state: 'Pending',
      entity_local_id: input.entity_local_id,
      entity_table: input.entity_table,
      client_uuid: input.client_uuid || newClientUuid(),
      retry_token: input.retry_token || newRetryToken(),
      attempts: 0,
      next_retry_at: null,
      last_error: null,
      depends_on: input.depends_on || [],
      payload: input.payload,
      priority: input.priority ?? 100,
    };
    await db.sync_queue.put(job);
    return job;
  },

  async listByState(states: SyncQueueJob['state'][]): Promise<SyncQueueJob[]> {
    const db = getOfflineDB();
    const all = await db.sync_queue.orderBy('created_at').toArray();
    return all.filter((j) => states.includes(j.state));
  },

  async getPendingFifo(limit = 50): Promise<SyncQueueJob[]> {
    const db = getOfflineDB();
    const now = nowIso();
    const all = await db.sync_queue
      .orderBy('created_at')
      .filter(
        (j) =>
          (j.state === 'Pending' || j.state === 'Retry') &&
          (!j.next_retry_at || j.next_retry_at <= now)
      )
      .toArray();
    return all.sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at)).slice(0, limit);
  },

  async markRunning(id: string): Promise<void> {
    const db = getOfflineDB();
    const job = await db.sync_queue.get(id);
    if (!job) return;
    await db.sync_queue.put({
      ...job,
      state: 'Running',
      sync_status: 'SYNCING',
      updated_at: nowIso(),
    });
  },

  async markSuccess(id: string, serverAck?: Record<string, unknown>): Promise<void> {
    const db = getOfflineDB();
    const job = await db.sync_queue.get(id);
    if (!job) return;
    await db.sync_queue.put({
      ...job,
      state: 'Success',
      sync_status: 'SYNCED',
      last_error: null,
      updated_at: nowIso(),
      payload: { ...job.payload, serverAck: serverAck || null },
      version: job.version + 1,
    });
  },

  async markFailed(id: string, error: string, asConflict = false): Promise<void> {
    const db = getOfflineDB();
    const job = await db.sync_queue.get(id);
    if (!job) return;
    const attempts = job.attempts + 1;
    await db.sync_queue.put({
      ...job,
      attempts,
      state: asConflict ? 'Conflict' : 'Retry',
      sync_status: asConflict ? 'CONFLICT' : 'FAILED',
      last_error: error,
      next_retry_at: asConflict ? null : nextRetryAt(attempts),
      updated_at: nowIso(),
      version: job.version + 1,
    });
  },

  async dependenciesSatisfied(job: SyncQueueJob): Promise<boolean> {
    if (!job.depends_on.length) return true;
    const db = getOfflineDB();
    for (const depId of job.depends_on) {
      const dep = await db.sync_queue.get(depId);
      if (!dep || dep.state !== 'Success') return false;
    }
    return true;
  },

  async counts(): Promise<{ pending: number; failed: number; conflict: number; running: number }> {
    const all = await getOfflineDB().sync_queue.toArray();
    return {
      pending: all.filter((j) => j.state === 'Pending' || j.state === 'Retry').length,
      failed: all.filter((j) => j.state === 'Failed' || (j.state === 'Retry' && j.attempts > 0)).length,
      conflict: all.filter((j) => j.state === 'Conflict').length,
      running: all.filter((j) => j.state === 'Running').length,
    };
  },

  async exportLogs(): Promise<string> {
    const all = await getOfflineDB().sync_queue.orderBy('created_at').toArray();
    return JSON.stringify(all, null, 2);
  },

  async requeue(id: string): Promise<void> {
    const db = getOfflineDB();
    const job = await db.sync_queue.get(id);
    if (!job) return;
    await db.sync_queue.put({
      ...job,
      state: 'Pending',
      sync_status: 'PENDING',
      next_retry_at: null,
      last_error: null,
      updated_at: nowIso(),
      version: job.version + 1,
    });
  },
};
