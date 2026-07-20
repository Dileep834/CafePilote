import { supabase } from '@/lib/supabase';
import type { AuditAction } from '../types';

export type AuditWriteInput = {
  outletId?: string | null;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  terminalId?: string;
  action: AuditAction | string;
  entityType?: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  managerApprovalId?: string | null;
};

/**
 * Immutable audit writer. Failures are logged but never block the primary transaction.
 */
export async function writeAuditLog(input: AuditWriteInput): Promise<string | null> {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([
        {
          outlet_id: input.outletId || null,
          user_id: input.userId || null,
          user_name: input.userName || null,
          user_role: input.userRole || null,
          terminal_id: input.terminalId || 'default',
          ip_address: null,
          user_agent: ua,
          action: input.action,
          entity_type: input.entityType || null,
          entity_id: input.entityId || null,
          old_value: input.oldValue ?? null,
          new_value: input.newValue ?? null,
          reason: input.reason || null,
          manager_approval_id: input.managerApprovalId || null,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('[audit] write skipped:', error.message);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.warn('[audit] write failed', err);
    return null;
  }
}

export async function fetchAuditLogs(params: {
  outletId?: string | null;
  limit?: number;
  action?: string;
}) {
  let q = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit || 100);

  if (params.outletId) q = q.eq('outlet_id', params.outletId);
  if (params.action) q = q.eq('action', params.action);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
