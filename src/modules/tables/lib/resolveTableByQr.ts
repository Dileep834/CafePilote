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

/** Public QR lookup — works on guest phones without staff localStorage. */
export async function resolveTableByQr(
  qrToken: string,
  outletId?: string
): Promise<Table | null> {
  const token = (qrToken || '').trim();
  if (!token) return null;

  // 1) Local store (same browser as staff / already hydrated)
  const localTables = useTableStore.getState().tables;
  const local =
    localTables.find((t) => t.qrCodeToken === token && (!outletId || t.outletId === outletId)) ||
    localTables.find((t) => t.qrCodeToken === token);
  if (local) return local;

  // 2) Cloud dining_tables by token (primary public path)
  try {
    const { data, error } = await supabase
      .from('dining_tables')
      .select('*')
      .eq('qr_code_token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      const table = fromRow(data);
      // Keep staff store in sync if opened on same device later
      const existing = useTableStore.getState().tables.find((t) => t.id === table.id);
      if (!existing) {
        useTableStore.setState((s) => ({ tables: [...s.tables, table] }));
      } else {
        useTableStore.setState((s) => ({
          tables: s.tables.map((t) => (t.id === table.id ? { ...t, ...table } : t)),
        }));
      }
      return table;
    }
  } catch {
    /* table may not exist yet */
  }

  return null;
}

/** Upsert a table row so guest QR links resolve on other devices. */
export async function syncTableForQr(table: Table): Promise<boolean> {
  if (!table.qrCodeToken) return false;

  const row = {
    outlet_id: table.outletId,
    table_number: table.tableNumber,
    capacity: table.capacity,
    status: table.status,
    table_type: table.type,
    qr_code_token: table.qrCodeToken,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  try {
    // Prefer update by id when cloud uuid
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      table.id
    );

    if (isUuid) {
      const { error } = await supabase.from('dining_tables').upsert(
        { id: table.id, ...row },
        { onConflict: 'id' }
      );
      if (!error) return true;
    }

    // Upsert by unique qr token
    const { data: existing } = await supabase
      .from('dining_tables')
      .select('id')
      .eq('qr_code_token', table.qrCodeToken)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from('dining_tables').update(row).eq('id', existing.id);
      if (!error) {
        if (existing.id !== table.id) {
          useTableStore.setState((s) => ({
            tables: s.tables.map((t) => (t.id === table.id ? { ...t, id: existing.id } : t)),
          }));
        }
        return true;
      }
    }

    const { data, error } = await supabase.from('dining_tables').insert([row]).select('id').single();
    if (error) throw error;
    if (data?.id && data.id !== table.id) {
      useTableStore.setState((s) => ({
        tables: s.tables.map((t) => (t.id === table.id ? { ...t, id: data.id } : t)),
      }));
    }
    return true;
  } catch (e) {
    console.error('syncTableForQr failed', e);
    return false;
  }
}
