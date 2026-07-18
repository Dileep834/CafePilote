import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Table, TableStatus, TableType } from '@/types';

export type TableFormInput = {
  outletId: string;
  tableNumber: string;
  capacity: number;
  type: TableType;
  status?: TableStatus;
};

interface TableState {
  tables: Table[];
  isLoading: boolean;
  lastError: string | null;
  cloudEnabled: boolean;

  fetchTables: (outletId?: string) => Promise<void>;
  addTable: (input: TableFormInput) => Promise<Table | null>;
  updateTable: (id: string, patch: Partial<Omit<Table, 'id'>>) => Promise<boolean>;
  updateTableStatus: (id: string, status: TableStatus) => Promise<boolean>;
  deleteTable: (id: string) => Promise<boolean>;
  generateQR: (id: string) => Promise<string | null>;
  assignOrder: (tableId: string, orderId: string) => Promise<boolean>;
  migrateLocalOutlet: (fromOutletId: string, toOutletId: string) => void;
  mergeTables: (primaryId: string, partnerIds: string[]) => Promise<boolean>;
  unmergeTables: (tableId: string) => Promise<boolean>;
  removeFromMerge: (tableId: string) => Promise<boolean>;
}

const LOCAL_SEED: Table[] = [
  { id: 't1', outletId: 'current-outlet', tableNumber: 'T-01', capacity: 2, status: 'available', type: 'square', qrCodeToken: 't1-xyz123' },
  { id: 't2', outletId: 'current-outlet', tableNumber: 'T-02', capacity: 4, status: 'occupied', type: 'round', currentOrderId: 'order-123' },
  { id: 't3', outletId: 'current-outlet', tableNumber: 'T-03', capacity: 4, status: 'available', type: 'square', qrCodeToken: 't3-abc456' },
  { id: 't4', outletId: 'current-outlet', tableNumber: 'T-04', capacity: 6, status: 'reserved', type: 'sofa' },
  { id: 't5', outletId: 'current-outlet', tableNumber: 'T-05', capacity: 2, status: 'cleaning', type: 'round' },
  { id: 't6', outletId: 'current-outlet', tableNumber: 'T-06', capacity: 8, status: 'available', type: 'sofa' },
];

function makeToken() {
  return `tok-${Math.random().toString(36).slice(2, 10)}`;
}

function makeMergeGroupId() {
  return `merge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function fromRow(row: any): Table {
  return {
    id: row.id,
    outletId: row.outlet_id,
    tableNumber: row.table_number,
    capacity: Number(row.capacity),
    status: row.status,
    type: row.table_type,
    qrCodeToken: row.qr_code_token || undefined,
    currentOrderId: row.current_order_id || undefined,
    mergeGroupId: row.merge_group_id || undefined,
    mergePrimaryId: row.merge_primary_id || undefined,
  };
}

function toRow(table: Partial<Table> & { outletId?: string }) {
  return {
    ...(table.outletId !== undefined ? { outlet_id: table.outletId } : {}),
    ...(table.tableNumber !== undefined ? { table_number: table.tableNumber } : {}),
    ...(table.capacity !== undefined ? { capacity: table.capacity } : {}),
    ...(table.status !== undefined ? { status: table.status } : {}),
    ...(table.type !== undefined ? { table_type: table.type } : {}),
    ...(table.qrCodeToken !== undefined ? { qr_code_token: table.qrCodeToken } : {}),
    ...(table.currentOrderId !== undefined ? { current_order_id: table.currentOrderId } : {}),
    ...(table.mergeGroupId !== undefined ? { merge_group_id: table.mergeGroupId || null } : {}),
    ...(table.mergePrimaryId !== undefined ? { merge_primary_id: table.mergePrimaryId || null } : {}),
    updated_at: new Date().toISOString(),
  };
}

async function persistMergeFields(tables: Table[]) {
  await Promise.all(
    tables.map((t) =>
      supabase
        .from('dining_tables')
        .update({
          merge_group_id: t.mergeGroupId || null,
          merge_primary_id: t.mergePrimaryId || null,
          status: t.status,
          current_order_id: t.currentOrderId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', t.id)
    )
  );
}

export function getNextStatusAction(status: TableStatus): {
  next: TableStatus;
  label: string;
  hint: string;
} {
  switch (status) {
    case 'available':
      return { next: 'occupied', label: 'Seat guests', hint: 'Mark table occupied when guests sit down' };
    case 'reserved':
      return { next: 'occupied', label: 'Seat reservation', hint: 'Guests arrived — convert reservation to occupied' };
    case 'occupied':
      return { next: 'cleaning', label: 'Clear table', hint: 'Order finished — send for cleaning' };
    case 'cleaning':
      return { next: 'available', label: 'Ready for guests', hint: 'Table cleaned — open for next seating' };
  }
}

export function getMergeGroup(tables: Table[], table: Table): Table[] {
  if (!table.mergeGroupId) return [table];
  return tables
    .filter((t) => t.mergeGroupId === table.mergeGroupId)
    .sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }));
}

export function getCombinedCapacity(group: Table[]): number {
  return group.reduce((sum, t) => sum + t.capacity, 0);
}

export function getMergeLabel(group: Table[]): string {
  return group.map((t) => t.tableNumber).join(' + ');
}

export function isMergePrimary(table: Table): boolean {
  if (!table.mergeGroupId) return true;
  return table.mergePrimaryId === table.id;
}

export const useTableStore = create<TableState>()(
  persist(
    (set, get) => ({
      tables: LOCAL_SEED,
      isLoading: false,
      lastError: null,
      cloudEnabled: false,

      fetchTables: async (outletId) => {
        set({ isLoading: true, lastError: null });
        try {
          let query = supabase
            .from('dining_tables')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('table_number', { ascending: true });

          if (outletId) query = query.eq('outlet_id', outletId);

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
            set({
              tables: data.map(fromRow),
              cloudEnabled: true,
              isLoading: false,
            });
            return;
          }

          set({ cloudEnabled: true, isLoading: false });
        } catch {
          set({ cloudEnabled: false, isLoading: false });
        }
      },

      addTable: async (input) => {
        set({ lastError: null });
        const number = input.tableNumber.trim().toUpperCase();
        if (!number) {
          set({ lastError: 'Table number is required' });
          return null;
        }
        if (get().tables.some((t) => t.outletId === input.outletId && t.tableNumber === number)) {
          set({ lastError: `Table ${number} already exists for this outlet` });
          return null;
        }

        const local: Table = {
          id: `local-${Date.now()}`,
          outletId: input.outletId,
          tableNumber: number,
          capacity: input.capacity,
          type: input.type,
          status: input.status || 'available',
          qrCodeToken: makeToken(),
        };

        try {
          const row = {
            outlet_id: local.outletId,
            table_number: local.tableNumber,
            capacity: local.capacity,
            status: local.status,
            table_type: local.type,
            qr_code_token: local.qrCodeToken,
            is_active: true,
          };
          const { data, error } = await supabase.from('dining_tables').insert([row]).select('*').single();

          if (error) throw error;
          const created = fromRow(data);
          set((s) => ({ tables: [...s.tables, created], cloudEnabled: true }));
          return created;
        } catch {
          set((s) => ({ tables: [...s.tables, local], cloudEnabled: false }));
          return local;
        }
      },

      updateTable: async (id, patch) => {
        set({ lastError: null });
        const prev = get().tables.find((t) => t.id === id);
        if (!prev) return false;

        if (patch.tableNumber) {
          const number = patch.tableNumber.trim().toUpperCase();
          patch = { ...patch, tableNumber: number };
          if (
            get().tables.some(
              (t) => t.id !== id && t.outletId === (patch.outletId || prev.outletId) && t.tableNumber === number
            )
          ) {
            set({ lastError: `Table ${number} already exists` });
            return false;
          }
        }

        const optimistic = { ...prev, ...patch };
        set((s) => ({ tables: s.tables.map((t) => (t.id === id ? optimistic : t)) }));

        try {
          const { error } = await supabase.from('dining_tables').update(toRow(patch)).eq('id', id);
          if (error) throw error;
          set({ cloudEnabled: true });
          return true;
        } catch {
          set({ cloudEnabled: false });
          return true;
        }
      },

      updateTableStatus: async (id, status) => {
        const clearOrder = status === 'available' || status === 'cleaning';
        const prev = get().tables.find((t) => t.id === id);
        if (!prev) return false;

        const groupIds = prev.mergeGroupId
          ? get()
              .tables.filter((t) => t.mergeGroupId === prev.mergeGroupId)
              .map((t) => t.id)
          : [id];

        set((s) => ({
          tables: s.tables.map((t) =>
            groupIds.includes(t.id)
              ? {
                  ...t,
                  status,
                  ...(clearOrder ? { currentOrderId: undefined } : {}),
                }
              : t
          ),
        }));

        try {
          const { error } = await supabase
            .from('dining_tables')
            .update({
              status,
              current_order_id: clearOrder ? null : prev.currentOrderId ?? null,
              updated_at: new Date().toISOString(),
            })
            .in('id', groupIds);
          if (error) throw error;
          set({ cloudEnabled: true });
          return true;
        } catch {
          set({ cloudEnabled: false });
          return true;
        }
      },

      migrateLocalOutlet: (fromOutletId, toOutletId) => {
        if (!toOutletId || fromOutletId === toOutletId) return;
        set((s) => ({
          tables: s.tables.map((t) =>
            t.outletId === fromOutletId ? { ...t, outletId: toOutletId } : t
          ),
        }));
      },

      mergeTables: async (primaryId, partnerIds) => {
        set({ lastError: null });
        const tables = get().tables;
        const primary = tables.find((t) => t.id === primaryId);
        if (!primary) {
          set({ lastError: 'Primary table not found' });
          return false;
        }

        const uniquePartners = [...new Set(partnerIds)].filter((id) => id !== primaryId);
        if (uniquePartners.length === 0) {
          set({ lastError: 'Select at least one table to merge' });
          return false;
        }

        const partners = uniquePartners
          .map((id) => tables.find((t) => t.id === id))
          .filter(Boolean) as Table[];

        if (partners.length !== uniquePartners.length) {
          set({ lastError: 'One or more tables were not found' });
          return false;
        }

        if (partners.some((p) => p.outletId !== primary.outletId)) {
          set({ lastError: 'Can only merge tables in the same outlet' });
          return false;
        }

        if (primary.status === 'cleaning' || partners.some((p) => p.status === 'cleaning')) {
          set({ lastError: 'Finish cleaning before merging tables' });
          return false;
        }

        const blocked = partners.filter(
          (p) => p.mergeGroupId && p.mergeGroupId !== primary.mergeGroupId
        );
        if (blocked.length > 0) {
          set({
            lastError: `${blocked.map((b) => b.tableNumber).join(', ')} already merged elsewhere — unmerge first`,
          });
          return false;
        }

        const groupId = primary.mergeGroupId || makeMergeGroupId();
        const resolvedPrimaryId = primary.mergeGroupId
          ? primary.mergePrimaryId || primary.id
          : primary.id;

        const memberIds = new Set<string>([resolvedPrimaryId, primary.id, ...uniquePartners]);
        if (primary.mergeGroupId) {
          tables
            .filter((t) => t.mergeGroupId === primary.mergeGroupId)
            .forEach((t) => memberIds.add(t.id));
        }

        const candidates = tables.filter((t) => memberIds.has(t.id));
        const sharedStatus: TableStatus = candidates.some((t) => t.status === 'occupied')
          ? 'occupied'
          : candidates.some((t) => t.status === 'reserved')
            ? 'reserved'
            : 'available';
        const sharedOrder =
          candidates.find((t) => t.currentOrderId)?.currentOrderId || primary.currentOrderId;

        const nextTables = tables.map((t) => {
          if (!memberIds.has(t.id)) return t;
          return {
            ...t,
            mergeGroupId: groupId,
            mergePrimaryId: resolvedPrimaryId,
            status: sharedStatus,
            currentOrderId: sharedOrder,
          };
        });

        set({ tables: nextTables });

        try {
          await persistMergeFields(nextTables.filter((t) => memberIds.has(t.id)));
          set({ cloudEnabled: true });
        } catch {
          set({ cloudEnabled: false });
        }

        return true;
      },

      unmergeTables: async (tableId) => {
        set({ lastError: null });
        const table = get().tables.find((t) => t.id === tableId);
        if (!table?.mergeGroupId) {
          set({ lastError: 'Table is not merged' });
          return false;
        }

        const groupId = table.mergeGroupId;
        const memberIds = get()
          .tables.filter((t) => t.mergeGroupId === groupId)
          .map((t) => t.id);

        set({
          tables: get().tables.map((t) =>
            t.mergeGroupId === groupId
              ? { ...t, mergeGroupId: undefined, mergePrimaryId: undefined }
              : t
          ),
        });

        try {
          await Promise.all(
            memberIds.map((id) =>
              supabase
                .from('dining_tables')
                .update({
                  merge_group_id: null,
                  merge_primary_id: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', id)
            )
          );
          set({ cloudEnabled: true });
        } catch {
          set({ cloudEnabled: false });
        }

        return true;
      },

      removeFromMerge: async (tableId) => {
        set({ lastError: null });
        const tables = get().tables;
        const table = tables.find((t) => t.id === tableId);
        if (!table?.mergeGroupId) {
          set({ lastError: 'Table is not merged' });
          return false;
        }

        const group = getMergeGroup(tables, table);
        if (group.length <= 2) {
          return get().unmergeTables(tableId);
        }

        const groupId = table.mergeGroupId;
        let primaryId = table.mergePrimaryId || group[0].id;
        const remaining = group.filter((t) => t.id !== tableId);
        if (primaryId === tableId) primaryId = remaining[0].id;

        const nextTables = tables.map((t) => {
          if (t.id === tableId) {
            return {
              ...t,
              mergeGroupId: undefined,
              mergePrimaryId: undefined,
              status: 'available' as TableStatus,
              currentOrderId: undefined,
            };
          }
          if (t.mergeGroupId === groupId) {
            return { ...t, mergePrimaryId: primaryId };
          }
          return t;
        });

        set({ tables: nextTables });

        try {
          await persistMergeFields(
            nextTables.filter((t) => t.id === tableId || t.mergeGroupId === groupId)
          );
          set({ cloudEnabled: true });
        } catch {
          set({ cloudEnabled: false });
        }

        return true;
      },

      deleteTable: async (id) => {
        set({ lastError: null });
        const target = get().tables.find((t) => t.id === id);
        if (target?.mergeGroupId) {
          await get().removeFromMerge(id);
        }

        set({ tables: get().tables.filter((t) => t.id !== id) });

        try {
          const { error } = await supabase
            .from('dining_tables')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) {
            await supabase.from('dining_tables').delete().eq('id', id);
          }
          return true;
        } catch {
          return true;
        }
      },

      generateQR: async (id) => {
        const token = makeToken();
        const ok = await get().updateTable(id, { qrCodeToken: token });
        if (!ok) return null;
        // Best-effort cloud sync so guest phones can resolve the QR
        try {
          const { syncTableForQr } = await import('../lib/resolveTableByQr');
          const table = get().tables.find((t) => t.id === id);
          if (table) await syncTableForQr({ ...table, qrCodeToken: token });
        } catch {
          /* optional */
        }
        return token;
      },

      assignOrder: async (tableId, orderId) => {
        return get().updateTable(tableId, { currentOrderId: orderId, status: 'occupied' });
      },
    }),
    {
      name: 'cafepilots-dining-tables',
      partialize: (s) => ({ tables: s.tables }),
    }
  )
);
