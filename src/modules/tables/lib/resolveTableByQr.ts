import { supabase } from '@/lib/supabase';
import type { Table } from '@/types';
import { useTableStore } from '../store/useTableStore';

function fromRow(row: any): Table {
  return {
    id: row.id,
    outletId: row.outlet_id,
    tableNumber: row.table_number,
    capacity: Number(row.capacity) || 2,
    status: row.status || 'available',
    type: row.table_type || 'square',
    qrCodeToken: row.qr_code_token || undefined,
    currentOrderId: row.current_order_id || undefined,
    mergeGroupId: row.merge_group_id || undefined,
    mergePrimaryId: row.merge_primary_id || undefined,
  };
}

export type ResolveTableByQrResult =
  | { ok: true; table: Table }
  | { ok: false; reason: 'missing_token' | 'not_found' | 'cloud_error'; message: string };

/** Public QR lookup — cloud first so guest phones don't depend on staff localStorage. */
export async function resolveTableByQrDetailed(
  qrToken: string,
  outletId?: string
): Promise<ResolveTableByQrResult> {
  const token = (qrToken || '').trim();
  if (!token) {
    return { ok: false, reason: 'missing_token', message: 'Missing QR token' };
  }

  // 1) Cloud dining_tables by token (primary public path for guest phones)
  try {
    let query = supabase
      .from('dining_tables')
      .select('*')
      .eq('qr_code_token', token)
      .eq('is_active', true);

    if (outletId && outletId !== 'current-outlet') {
      query = query.eq('outlet_id', outletId);
    }

    let { data, error } = await query.maybeSingle();

    // Retry without outlet filter if outlet-prefixed URL was wrong / outdated
    if ((!data || error) && outletId) {
      ({ data, error } = await supabase
        .from('dining_tables')
        .select('*')
        .eq('qr_code_token', token)
        .eq('is_active', true)
        .maybeSingle());
    }

    if (error) {
      return {
        ok: false,
        reason: 'cloud_error',
        message: error.message || 'Could not reach table directory',
      };
    }

    if (data) {
      const table = fromRow(data);
      const existing = useTableStore.getState().tables.find((t) => t.id === table.id);
      if (!existing) {
        useTableStore.setState((s) => ({ tables: [...s.tables, table] }));
      } else {
        useTableStore.setState((s) => ({
          tables: s.tables.map((t) => (t.id === table.id ? { ...t, ...table } : t)),
        }));
      }
      return { ok: true, table };
    }
  } catch (e: any) {
    return {
      ok: false,
      reason: 'cloud_error',
      message: e?.message || 'Could not resolve QR',
    };
  }

  // 2) Local fallback (same browser as staff / offline demo)
  const localTables = useTableStore.getState().tables;
  const local =
    localTables.find((t) => t.qrCodeToken === token && (!outletId || t.outletId === outletId)) ||
    localTables.find((t) => t.qrCodeToken === token);
  if (local) return { ok: true, table: local };

  return {
    ok: false,
    reason: 'not_found',
    message: 'This QR is not linked to an active table. Ask staff to print a new QR.',
  };
}

/** Public QR lookup — works on guest phones without staff localStorage. */
export async function resolveTableByQr(
  qrToken: string,
  outletId?: string
): Promise<Table | null> {
  const result = await resolveTableByQrDetailed(qrToken, outletId);
  return result.ok ? result.table : null;
}

/** Upsert a table row so guest QR links resolve on other devices. */
export async function syncTableForQr(table: Table): Promise<boolean> {
  if (!table.qrCodeToken) return false;

  // Never write placeholder outlet into cloud — guest tickets would vanish from KDS
  let outletId = table.outletId;
  if (!outletId || outletId === 'current-outlet' || outletId.startsWith('local')) {
    try {
      const { getTenantOutletId } = await import('@/store/useTenantStore');
      const { useAuthStore } = await import('@/store/useAuthStore');
      const tenant = getTenantOutletId(useAuthStore.getState().user);
      if (tenant && tenant !== 'current-outlet' && !tenant.startsWith('local')) {
        outletId = tenant;
      }
    } catch {
      /* keep original */
    }
  }

  const row = {
    outlet_id: outletId,
    table_number: table.tableNumber,
    capacity: table.capacity,
    status: table.status,
    table_type: table.type,
    qr_code_token: table.qrCodeToken,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      table.id
    );

    if (isUuid) {
      const { error } = await supabase.from('dining_tables').upsert(
        { id: table.id, ...row },
        { onConflict: 'id' }
      );
      if (!error) {
        if (outletId !== table.outletId) {
          useTableStore.setState((s) => ({
            tables: s.tables.map((t) => (t.id === table.id ? { ...t, outletId } : t)),
          }));
        }
        return true;
      }
    }

    const { data: existing } = await supabase
      .from('dining_tables')
      .select('id')
      .eq('qr_code_token', table.qrCodeToken)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from('dining_tables').update(row).eq('id', existing.id);
      if (!error) {
        useTableStore.setState((s) => ({
          tables: s.tables.map((t) =>
            t.id === table.id || t.id === existing.id
              ? { ...t, id: existing.id, outletId }
              : t
          ),
        }));
        return true;
      }
    }

    const { data, error } = await supabase.from('dining_tables').insert([row]).select('id').single();
    if (error) throw error;
    if (data?.id) {
      useTableStore.setState((s) => ({
        tables: s.tables.map((t) =>
          t.id === table.id ? { ...t, id: data.id, outletId } : t
        ),
      }));
    }
    return true;
  } catch (e) {
    console.error('syncTableForQr failed', e);
    return false;
  }
}
