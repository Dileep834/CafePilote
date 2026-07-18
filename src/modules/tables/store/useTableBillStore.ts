import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Table } from '@/types';
import {
  getMergeGroup,
  getMergeLabel,
  isMergePrimary,
  useTableStore,
} from './useTableStore';

export type TableBillItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  /** Already fired to kitchen */
  fired?: boolean;
};

export type TableBill = {
  id: string;
  tableId: string;
  outletId: string;
  tableLabel: string;
  mergeGroupId?: string;
  items: TableBillItem[];
  status: 'open' | 'paid';
  source: 'pos' | 'qr';
  cloudOrderId?: string;
  createdAt: string;
  updatedAt: string;
};

type AddItemInput = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

interface TableBillState {
  bills: TableBill[];
  lastError: string | null;
  isHydrating: boolean;

  resolveBillTableId: (table: Table, allTables: Table[]) => string;
  getOpenBill: (tableId: string) => TableBill | undefined;
  getOpenBillForTable: (table: Table, allTables: Table[]) => TableBill | undefined;
  getBillTotal: (bill: TableBill) => number;
  getUnfiredItems: (bill: TableBill) => TableBillItem[];

  hydrateOpenBills: (outletId?: string) => Promise<void>;
  ensureOpenBill: (table: Table, allTables: Table[], source?: 'pos' | 'qr') => TableBill;
  addItemsToTable: (
    table: Table,
    allTables: Table[],
    items: AddItemInput[],
    source?: 'pos' | 'qr',
    options?: { fireKitchen?: boolean; guestName?: string; guestEmail?: string }
  ) => Promise<TableBill>;
  replaceBillItems: (tableId: string, items: TableBillItem[]) => void;
  syncBillFromCart: (tableId: string, items: TableBillItem[]) => void;
  /** Fire unfired (or provided) items to kitchen as a ticket */
  fireKitchenTicket: (
    tableId: string,
    items?: TableBillItem[],
    source?: 'pos' | 'qr',
    guest?: { name?: string; email?: string }
  ) => Promise<boolean>;
  settleBill: (tableId: string, paidOrderId?: string) => Promise<void>;
  discardBill: (tableId: string) => Promise<void>;
  /** Move open check + party from one table to an available table */
  movePartyToTable: (
    fromTable: Table,
    toTableId: string,
    allTables: Table[]
  ) => Promise<boolean>;
}

function nowIso() {
  return new Date().toISOString();
}

function safeOutletId(outletId: string) {
  if (!outletId || outletId === 'current-outlet' || outletId.startsWith('local')) return null;
  return outletId;
}

function mergeItems(existing: TableBillItem[], incoming: AddItemInput[]): TableBillItem[] {
  const next = [...existing];
  for (const item of incoming) {
    const idx = next.findIndex(
      (x) =>
        x.productId === item.productId &&
        (x.notes || '') === (item.notes || '') &&
        !x.fired
    );
    if (idx >= 0) {
      next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity, fired: false };
    } else {
      next.push({
        id: crypto.randomUUID(),
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
        fired: false,
      });
    }
  }
  return next;
}

async function upsertCloudOpenOrder(bill: TableBill): Promise<string | undefined> {
  const subtotal = bill.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const total = subtotal + tax;

  const fullPayload = {
    outlet_id: safeOutletId(bill.outletId),
    customer_name: `Table ${bill.tableLabel}`,
    table_id: bill.tableId,
    table_number: bill.tableLabel,
    order_source: bill.source,
    total_amount: total,
    tax_amount: tax,
    status: 'open',
    kitchen_status: 'delivered', // open checks never appear on KDS
    payment_method: 'pending',
    notes: `Open bill · ${bill.tableLabel}`,
    updated_at: nowIso(),
  };

  const legacyPayload = {
    outlet_id: safeOutletId(bill.outletId),
    customer_name: `Table ${bill.tableLabel}`,
    total_amount: total,
    tax_amount: tax,
    status: 'open',
    kitchen_status: 'delivered',
    notes: `Open bill · ${bill.tableLabel} · table:${bill.tableId}`,
    updated_at: nowIso(),
  };

  try {
    if (bill.cloudOrderId) {
      let { error } = await supabase.from('pos_orders').update(fullPayload).eq('id', bill.cloudOrderId);
      if (error) {
        ({ error } = await supabase.from('pos_orders').update(legacyPayload).eq('id', bill.cloudOrderId));
      }
      if (error) throw error;
      return bill.cloudOrderId;
    }

    let { data, error } = await supabase.from('pos_orders').insert([fullPayload]).select('id').single();
    if (error) {
      ({ data, error } = await supabase.from('pos_orders').insert([legacyPayload]).select('id').single());
    }
    if (error) throw error;
    return data?.id as string;
  } catch {
    return undefined;
  }
}

async function insertKitchenTicket(params: {
  outletId: string;
  tableId: string;
  tableLabel: string;
  source: 'pos' | 'qr';
  items: TableBillItem[];
  guestName?: string;
  guestEmail?: string;
}): Promise<string | undefined> {
  if (params.items.length === 0) return undefined;

  const subtotal = params.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const guestLabel = params.guestName || params.guestEmail;
  const customerName = guestLabel
    ? `${guestLabel} · Table ${params.tableLabel}`
    : `Table ${params.tableLabel}`;
  const notes = [
    `Kitchen · ${params.tableLabel}`,
    params.guestEmail ? `guest:${params.guestEmail}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const fullPayload = {
    outlet_id: safeOutletId(params.outletId),
    customer_name: customerName,
    customer_phone: params.guestEmail || null,
    table_id: params.tableId,
    table_number: params.tableLabel,
    order_source: params.source,
    total_amount: subtotal + tax,
    tax_amount: tax,
    status: 'sent',
    kitchen_status: 'pending',
    payment_method: 'pending',
    notes,
  };

  const legacyPayload = {
    outlet_id: safeOutletId(params.outletId),
    customer_name: customerName,
    customer_phone: params.guestEmail || null,
    total_amount: subtotal + tax,
    tax_amount: tax,
    status: 'sent',
    kitchen_status: 'pending',
    notes: `${notes} · table:${params.tableId}`,
  };

  try {
    let { data, error } = await supabase.from('pos_orders').insert([fullPayload]).select('id').single();
    if (error) {
      ({ data, error } = await supabase.from('pos_orders').insert([legacyPayload]).select('id').single());
    }
    if (error) throw error;

    const orderId = data.id as string;
    const rows = params.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId?.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
        ? item.productId
        : null,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase.from('pos_order_items').insert(rows);
    if (itemsError) throw itemsError;
    return orderId;
  } catch (e) {
    console.error('Kitchen ticket failed', e);
    return undefined;
  }
}

export const useTableBillStore = create<TableBillState>()(
  persist(
    (set, get) => ({
      bills: [],
      lastError: null,
      isHydrating: false,

      resolveBillTableId: (table, allTables) => {
        if (!table.mergeGroupId) return table.id;
        const group = getMergeGroup(allTables, table);
        const primary = group.find((t) => isMergePrimary(t)) || group[0];
        return primary?.id || table.id;
      },

      getOpenBill: (tableId) =>
        get().bills.find((b) => b.tableId === tableId && b.status === 'open'),

      getOpenBillForTable: (table, allTables) => {
        const billTableId = get().resolveBillTableId(table, allTables);
        return get().getOpenBill(billTableId);
      },

      getBillTotal: (bill) => bill.items.reduce((s, i) => s + i.price * i.quantity, 0),

      getUnfiredItems: (bill) => bill.items.filter((i) => !i.fired),

      hydrateOpenBills: async (outletId) => {
        set({ isHydrating: true, lastError: null });
        try {
          let query = supabase
            .from('pos_orders')
            .select(
              `
              id, outlet_id, table_id, table_number, order_source, status, notes, created_at, updated_at,
              pos_order_items ( product_id, product_name, quantity, unit_price )
            `
            )
            .eq('status', 'open')
            .order('updated_at', { ascending: false });

          if (outletId && safeOutletId(outletId)) {
            query = query.eq('outlet_id', outletId);
          }

          const { data, error } = await query;
          if (error) throw error;
          if (!data?.length) {
            set({ isHydrating: false });
            return;
          }

          const remoteBills: TableBill[] = data
            .filter((row: any) => row.table_id || (row.notes || '').includes('table:'))
            .map((row: any) => {
              const tableId =
                row.table_id ||
                String(row.notes || '')
                  .split('table:')[1]
                  ?.trim() ||
                row.id;
              return {
                id: `cloud-${row.id}`,
                tableId,
                outletId: row.outlet_id || outletId || 'current-outlet',
                tableLabel: row.table_number || row.customer_name?.replace(/^Table\s+/i, '') || 'Table',
                items: (row.pos_order_items || []).map((item: any) => ({
                  id: crypto.randomUUID(),
                  productId: item.product_id || '',
                  name: item.product_name,
                  price: Number(item.unit_price) || 0,
                  quantity: Number(item.quantity) || 1,
                  fired: true,
                })),
                status: 'open' as const,
                source: (row.order_source === 'qr' ? 'qr' : 'pos') as 'pos' | 'qr',
                cloudOrderId: row.id,
                createdAt: row.created_at,
                updatedAt: row.updated_at || row.created_at,
              };
            });

          set((s) => {
            const localOpen = s.bills.filter((b) => b.status === 'open');
            const merged = [...localOpen];
            for (const remote of remoteBills) {
              const idx = merged.findIndex((b) => b.tableId === remote.tableId);
              if (idx < 0) merged.push(remote);
              else if (!merged[idx].cloudOrderId) {
                merged[idx] = {
                  ...merged[idx],
                  cloudOrderId: remote.cloudOrderId,
                  items: merged[idx].items.length ? merged[idx].items : remote.items,
                };
              }
            }
            return {
              bills: [...merged, ...s.bills.filter((b) => b.status === 'paid')].slice(-60),
              isHydrating: false,
            };
          });
        } catch {
          set({ isHydrating: false });
        }
      },

      ensureOpenBill: (table, allTables, source = 'pos') => {
        const billTableId = get().resolveBillTableId(table, allTables);
        const existing = get().getOpenBill(billTableId);
        if (existing) {
          // Refresh merge label if needed
          const group = getMergeGroup(allTables, table);
          const label = group.length > 1 ? getMergeLabel(group) : existing.tableLabel;
          if (label !== existing.tableLabel) {
            const updated = { ...existing, tableLabel: label, mergeGroupId: table.mergeGroupId };
            set((s) => ({ bills: s.bills.map((b) => (b.id === existing.id ? updated : b)) }));
            return updated;
          }
          return existing;
        }

        const group = getMergeGroup(allTables, table);
        const primary = allTables.find((t) => t.id === billTableId) || table;
        const label = group.length > 1 ? getMergeLabel(group) : primary.tableNumber;

        const bill: TableBill = {
          id: `bill-${Date.now()}`,
          tableId: billTableId,
          outletId: primary.outletId,
          tableLabel: label,
          mergeGroupId: primary.mergeGroupId,
          items: [],
          status: 'open',
          source,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        set((s) => ({
          bills: [...s.bills.filter((b) => !(b.tableId === billTableId && b.status === 'open')), bill],
        }));

        void useTableStore.getState().assignOrder(billTableId, bill.id);
        if (primary.status === 'available' || primary.status === 'reserved') {
          void useTableStore.getState().updateTableStatus(billTableId, 'occupied');
        }

        void upsertCloudOpenOrder(bill).then((cloudId) => {
          if (!cloudId) return;
          set((s) => ({
            bills: s.bills.map((b) => (b.id === bill.id ? { ...b, cloudOrderId: cloudId } : b)),
          }));
        });

        return bill;
      },

      addItemsToTable: async (table, allTables, items, source = 'pos', options) => {
        const fireKitchen = options?.fireKitchen !== false;
        const bill = get().ensureOpenBill(table, allTables, source);
        const nextItems = mergeItems(bill.items, items);
        let updated: TableBill = {
          ...bill,
          items: nextItems,
          source: bill.items.length === 0 ? source : bill.source,
          updatedAt: nowIso(),
        };

        set((s) => ({
          bills: s.bills.map((b) => (b.id === bill.id ? updated : b)),
          lastError: null,
        }));

        const cloudId = await upsertCloudOpenOrder(updated);
        if (cloudId) {
          updated = { ...updated, cloudOrderId: cloudId };
          set((s) => ({
            bills: s.bills.map((b) => (b.id === updated.id ? updated : b)),
          }));
        }

        void useTableStore.getState().assignOrder(updated.tableId, updated.id);
        void useTableStore.getState().updateTableStatus(updated.tableId, 'occupied');

        if (fireKitchen) {
          const justAdded = mergeItems([], items);
          await get().fireKitchenTicket(updated.tableId, justAdded, source, {
            name: options?.guestName,
            email: options?.guestEmail,
          });
        }

        return get().getOpenBill(updated.tableId) || updated;
      },

      replaceBillItems: (tableId, items) => {
        const bill = get().getOpenBill(tableId);
        if (!bill) return;

        // Preserve fired flags when syncing from cart by matching product lines
        const next = items.map((item) => {
          const prev = bill.items.find(
            (x) => x.productId === item.productId && (x.notes || '') === (item.notes || '')
          );
          return {
            ...item,
            fired: prev?.fired && prev.quantity === item.quantity ? true : false,
          };
        });

        const updated = { ...bill, items: next, updatedAt: nowIso() };
        set((s) => ({
          bills: s.bills.map((b) => (b.id === bill.id ? updated : b)),
        }));
        void upsertCloudOpenOrder(updated).then((cloudId) => {
          if (!cloudId) return;
          set((s) => ({
            bills: s.bills.map((b) => (b.id === updated.id ? { ...b, cloudOrderId: cloudId } : b)),
          }));
        });
      },

      syncBillFromCart: (tableId, items) => {
        get().replaceBillItems(tableId, items);
      },

      fireKitchenTicket: async (tableId, items, source = 'pos', guest) => {
        const bill = get().getOpenBill(tableId);
        if (!bill) {
          set({ lastError: 'No open bill for this table' });
          return false;
        }

        const toFire = items?.length ? items : bill.items.filter((i) => !i.fired);
        if (toFire.length === 0) {
          set({ lastError: 'Nothing new to send to kitchen' });
          return false;
        }

        const ticketId = await insertKitchenTicket({
          outletId: bill.outletId,
          tableId: bill.tableId,
          tableLabel: bill.tableLabel,
          source: source || bill.source,
          items: toFire,
          guestName: guest?.name,
          guestEmail: guest?.email,
        });

        if (!ticketId) {
          set({ lastError: 'Could not reach kitchen — check connection / run table_billing_schema.sql' });
          return false;
        }

        // Mark matching lines as fired
        const firedKeys = new Set(toFire.map((i) => `${i.productId}|${i.notes || ''}`));
        const nextItems = bill.items.map((item) =>
          firedKeys.has(`${item.productId}|${item.notes || ''}`) ? { ...item, fired: true } : item
        );

        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === bill.id ? { ...b, items: nextItems, updatedAt: nowIso() } : b
          ),
          lastError: null,
        }));

        return true;
      },

      settleBill: async (tableId, paidOrderId) => {
        const bill = get().getOpenBill(tableId);
        if (!bill) return;

        // Fire any remaining unfired items before closing (staff forgot Send)
        const unfired = bill.items.filter((i) => !i.fired);
        if (unfired.length > 0) {
          await get().fireKitchenTicket(tableId, unfired, bill.source);
        }

        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === bill.id
              ? {
                  ...b,
                  status: 'paid' as const,
                  updatedAt: nowIso(),
                  cloudOrderId: paidOrderId || b.cloudOrderId,
                }
              : b
          ),
        }));

        if (bill.cloudOrderId && bill.cloudOrderId !== paidOrderId) {
          try {
            await supabase
              .from('pos_orders')
              .update({
                status: 'completed',
                kitchen_status: 'delivered',
                payment_method: 'settled',
                updated_at: nowIso(),
                notes: `Settled · ${bill.tableLabel}`,
              })
              .eq('id', bill.cloudOrderId);
          } catch {
            try {
              await supabase.from('pos_orders').delete().eq('id', bill.cloudOrderId);
            } catch {
              /* ignore */
            }
          }
        }

        const { updateTableStatus, unmergeTables, tables } = useTableStore.getState();
        await updateTableStatus(tableId, 'cleaning');

        const table = tables.find((t) => t.id === tableId);
        if (table?.mergeGroupId) {
          await unmergeTables(tableId);
        }

        set((s) => ({
          bills: s.bills.filter((b) => b.status === 'open' || b.id === bill.id).slice(-40),
        }));
      },

      discardBill: async (tableId) => {
        const bill = get().getOpenBill(tableId);
        if (!bill) return;
        set((s) => ({ bills: s.bills.filter((b) => b.id !== bill.id) }));
        if (bill.cloudOrderId) {
          try {
            await supabase.from('pos_orders').delete().eq('id', bill.cloudOrderId);
          } catch {
            /* ignore */
          }
        }
        void useTableStore.getState().updateTable(tableId, { currentOrderId: undefined });
      },

      movePartyToTable: async (fromTable, toTableId, allTables) => {
        const { tables, updateTableStatus, unmergeTables, assignOrder, updateTable } =
          useTableStore.getState();
        const live = tables.length ? tables : allTables;
        const target = live.find((t) => t.id === toTableId);
        if (!target) {
          set({ lastError: 'Target table not found' });
          return false;
        }
        if (target.id === fromTable.id) {
          set({ lastError: 'Pick a different table' });
          return false;
        }
        if (target.status !== 'available') {
          set({ lastError: 'Target table must be available' });
          return false;
        }
        if (target.mergeGroupId) {
          set({ lastError: 'Unmerge the target table first' });
          return false;
        }
        if (get().getOpenBill(target.id)) {
          set({ lastError: 'Target table already has an open bill' });
          return false;
        }

        const sourceBillId = get().resolveBillTableId(fromTable, live);
        let bill = get().getOpenBill(sourceBillId) || get().getOpenBillForTable(fromTable, live);
        const groupBefore = getMergeGroup(live, fromTable);
        const toClean = groupBefore.map((t) => t.id);

        if (fromTable.mergeGroupId) {
          await unmergeTables(fromTable.id);
        }

        if (bill) {
          const moved: TableBill = {
            ...bill,
            tableId: target.id,
            tableLabel: target.tableNumber,
            mergeGroupId: undefined,
            updatedAt: nowIso(),
          };
          set((s) => ({
            bills: s.bills.map((b) => (b.id === bill!.id ? moved : b)),
            lastError: null,
          }));
          bill = moved;

          const cloudId = await upsertCloudOpenOrder(moved);
          if (cloudId && cloudId !== moved.cloudOrderId) {
            set((s) => ({
              bills: s.bills.map((b) =>
                b.id === moved.id ? { ...b, cloudOrderId: cloudId } : b
              ),
            }));
          }

          await assignOrder(target.id, moved.id);
        } else {
          await updateTableStatus(
            target.id,
            fromTable.status === 'reserved' ? 'reserved' : 'occupied'
          );
          set({ lastError: null });
        }

        for (const id of toClean) {
          if (id === target.id) continue;
          await updateTableStatus(id, 'cleaning');
          await updateTable(id, { currentOrderId: undefined });
        }

        try {
          const { usePOSStore } = await import('@/modules/pos/store/usePOSStore');
          const pos = usePOSStore.getState();
          if (
            pos.activeTableId &&
            (pos.activeTableId === sourceBillId || pos.activeTableId === fromTable.id)
          ) {
            usePOSStore.setState({
              activeTableId: target.id,
              activeTableLabel: target.tableNumber,
              customerName: `Table ${target.tableNumber}`,
            });
          }
        } catch {
          /* POS optional */
        }

        return true;
      },
    }),
    {
      name: 'cafepilots-table-bills',
      partialize: (s) => ({ bills: s.bills }),
    }
  )
);
