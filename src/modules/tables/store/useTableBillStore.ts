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
import { getTenantOutletId } from '@/store/useTenantStore';
import { useAuthStore } from '@/store/useAuthStore';

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

/** Prefer real tenant/branch id when table still has placeholder outlet */
function resolveBillOutletId(tableOutletId: string | undefined | null): string {
  const fromTable = safeOutletId(tableOutletId || '');
  if (fromTable) return fromTable;
  const tenant = safeOutletId(getTenantOutletId(useAuthStore.getState().user));
  if (tenant) return tenant;
  return tableOutletId || 'current-outlet';
}

/** Find an existing open cloud check for this table to avoid duplicate inserts */
async function findExistingOpenCloudOrder(tableId: string): Promise<string | undefined> {
  try {
    const { data, error } = await supabase
      .from('pos_orders')
      .select('id')
      .eq('status', 'open')
      .eq('table_id', tableId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data?.id) return data.id as string;

    // Legacy: table id only in notes
    const { data: legacy } = await supabase
      .from('pos_orders')
      .select('id, notes')
      .eq('status', 'open')
      .ilike('notes', `%table:${tableId}%`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return legacy?.id as string | undefined;
  } catch {
    return undefined;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toOrderItemRows(orderId: string, items: TableBillItem[]) {
  return items.map((item) => ({
    order_id: orderId,
    product_id: item.productId && UUID_RE.test(item.productId) ? item.productId : null,
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity,
  }));
}

/** Keep open-check line items in sync so staff POS can hydrate QR guest orders. */
async function syncCloudOrderItems(orderId: string, items: TableBillItem[]) {
  const { error: delErr } = await supabase.from('pos_order_items').delete().eq('order_id', orderId);
  if (delErr) throw delErr;
  if (items.length === 0) return;
  const { error } = await supabase.from('pos_order_items').insert(toOrderItemRows(orderId, items));
  if (error) throw error;
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

function billItemScore(bill: Pick<TableBill, 'items' | 'updatedAt'>) {
  const qty = bill.items.reduce((s, i) => s + i.quantity, 0);
  return qty * 1e12 + new Date(bill.updatedAt || 0).getTime();
}

function mapCloudItems(rows: any[] | null | undefined, fired = true): TableBillItem[] {
  return (rows || []).map((item: any) => ({
    id: crypto.randomUUID(),
    productId: item.product_id || '',
    name: item.product_name,
    price: Number(item.unit_price) || 0,
    quantity: Number(item.quantity) || 1,
    fired,
  }));
}

/** Recover line items from kitchen tickets when an open check header has no rows (legacy bug). */
async function fetchSentItemsForTable(tableId: string): Promise<TableBillItem[]> {
  try {
    const { data, error } = await supabase
      .from('pos_orders')
      .select(
        `
        id, table_id, notes, created_at,
        pos_order_items ( product_id, product_name, quantity, unit_price )
      `
      )
      .eq('status', 'sent')
      .or(`table_id.eq.${tableId},notes.ilike.%table:${tableId}%`)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error || !data?.length) return [];

    const merged: TableBillItem[] = [];
    for (const row of data) {
      for (const item of mapCloudItems(row.pos_order_items, true)) {
        const idx = merged.findIndex(
          (x) => x.productId === item.productId && x.name === item.name && (x.notes || '') === (item.notes || '')
        );
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + item.quantity };
        } else {
          merged.push(item);
        }
      }
    }
    return merged;
  } catch {
    return [];
  }
}

async function upsertCloudOpenOrder(bill: TableBill): Promise<string | undefined> {
  const subtotal = bill.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const total = subtotal + tax;
  const outletId = safeOutletId(resolveBillOutletId(bill.outletId));

  const fullPayload = {
    outlet_id: outletId,
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
    outlet_id: outletId,
    customer_name: `Table ${bill.tableLabel}`,
    total_amount: total,
    tax_amount: tax,
    status: 'open',
    kitchen_status: 'delivered',
    notes: `Open bill · ${bill.tableLabel} · table:${bill.tableId}`,
    updated_at: nowIso(),
  };

  try {
    let orderId = bill.cloudOrderId;
    if (!orderId) {
      orderId = await findExistingOpenCloudOrder(bill.tableId);
    }

    if (orderId) {
      let { error } = await supabase.from('pos_orders').update(fullPayload).eq('id', orderId);
      if (error) {
        ({ error } = await supabase.from('pos_orders').update(legacyPayload).eq('id', orderId));
      }
      if (error) throw error;
    } else {
      let { data, error } = await supabase.from('pos_orders').insert([fullPayload]).select('id').single();
      if (error) {
        ({ data, error } = await supabase.from('pos_orders').insert([legacyPayload]).select('id').single());
      }
      if (error) throw error;
      orderId = data?.id as string;
    }

    if (orderId) {
      await syncCloudOrderItems(orderId, bill.items);
    }
    return orderId;
  } catch (e) {
    console.error('upsertCloudOpenOrder failed', e);
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
    outlet_id: safeOutletId(resolveBillOutletId(params.outletId)),
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
    outlet_id: safeOutletId(resolveBillOutletId(params.outletId)),
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
    const { error: itemsError } = await supabase
      .from('pos_order_items')
      .insert(toOrderItemRows(orderId, params.items));
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
          const outlet = safeOutletId(outletId || '');
          let query = supabase
            .from('pos_orders')
            .select(
              `
              id, outlet_id, table_id, table_number, order_source, status, notes, created_at, updated_at, total_amount,
              pos_order_items ( product_id, product_name, quantity, unit_price )
            `
            )
            .eq('status', 'open')
            .order('updated_at', { ascending: false });

          // Strict outlet scope — never pull other tenants via null outlet_id
          if (outlet) {
            query = query.eq('outlet_id', outlet);
          } else {
            set({ isHydrating: false });
            return;
          }

          const { data, error } = await query;
          if (error) throw error;
          if (!data?.length) {
            set({ isHydrating: false });
            return;
          }

          const mapped: TableBill[] = [];
          const needsItemBackfill: TableBill[] = [];
          for (const row of data as any[]) {
            if (!row.table_id && !(row.notes || '').includes('table:')) continue;
            const tableId =
              row.table_id ||
              String(row.notes || '')
                .split('table:')[1]
                ?.trim()
                ?.split(/\s|·/)[0] ||
              row.id;

            // Start unfired; mark fired only when a matching kitchen ticket exists
            let items = mapCloudItems(row.pos_order_items, false);
            let recoveredFromKitchen = false;
            const sentItems = await fetchSentItemsForTable(tableId);
            if (items.length === 0 && sentItems.length) {
              items = sentItems;
              recoveredFromKitchen = true;
            } else if (sentItems.length > 0 && items.length > 0) {
              items = items.map((item) => ({
                ...item,
                fired: sentItems.some(
                  (s) =>
                    (s.productId && s.productId === item.productId) ||
                    (s.name === item.name && s.price === item.price)
                ),
              }));
            } else if (row.order_source === 'qr' && items.length > 0 && sentItems.length === 0) {
              // QR lines on open check with no kitchen ticket — staff can re-send
              items = items.map((item) => ({ ...item, fired: false }));
            }

            const bill: TableBill = {
              id: `cloud-${row.id}`,
              tableId,
              outletId: row.outlet_id || outletId || 'current-outlet',
              tableLabel:
                row.table_number ||
                String(row.customer_name || '')
                  .replace(/^Table\s+/i, '')
                  .split('·')[0]
                  ?.trim() ||
                'Table',
              items,
              status: 'open' as const,
              source: (row.order_source === 'qr' ? 'qr' : 'pos') as 'pos' | 'qr',
              cloudOrderId: row.id,
              createdAt: row.created_at,
              updatedAt: row.updated_at || row.created_at,
            };
            mapped.push(bill);
            if (recoveredFromKitchen && bill.cloudOrderId) needsItemBackfill.push(bill);
          }

          // One open check per table — prefer the one with more items / newer update
          const byTable = new Map<string, TableBill>();
          for (const bill of mapped) {
            const prev = byTable.get(bill.tableId);
            if (!prev || billItemScore(bill) > billItemScore(prev)) {
              byTable.set(bill.tableId, bill);
            }
          }
          const remoteBills = [...byTable.values()];

          set((s) => {
            const localOpen = s.bills.filter((b) => b.status === 'open');
            const merged = [...localOpen];
            for (const remote of remoteBills) {
              const idx = merged.findIndex(
                (b) => b.tableId === remote.tableId || b.cloudOrderId === remote.cloudOrderId
              );
              if (idx < 0) {
                merged.push(remote);
                continue;
              }
              const local = merged[idx];
              const preferRemote =
                billItemScore(remote) > billItemScore(local) ||
                (remote.items.length > 0 && local.items.length === 0);
              merged[idx] = {
                ...local,
                cloudOrderId: remote.cloudOrderId || local.cloudOrderId,
                source: preferRemote ? remote.source : local.source,
                tableLabel: remote.tableLabel || local.tableLabel,
                outletId: remote.outletId || local.outletId,
                items: preferRemote ? remote.items : local.items,
                updatedAt: preferRemote ? remote.updatedAt : local.updatedAt,
              };
            }
            return {
              bills: [...merged, ...s.bills.filter((b) => b.status === 'paid')].slice(-60),
              isHydrating: false,
            };
          });

          // Backfill open-order items in cloud when we recovered from kitchen tickets
          for (const bill of needsItemBackfill) {
            if (bill.cloudOrderId && bill.items.length > 0) {
              void syncCloudOrderItems(bill.cloudOrderId, bill.items).catch(() => undefined);
            }
          }
        } catch (e) {
          console.error('hydrateOpenBills failed', e);
          set({
            isHydrating: false,
            lastError: e instanceof Error ? e.message : 'Could not refresh open bills',
          });
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
        const tenantOutlet = getTenantOutletId(useAuthStore.getState().user);
        const outletId = resolveBillOutletId(primary.outletId || tenantOutlet);

        const bill: TableBill = {
          id: `bill-${Date.now()}`,
          tableId: billTableId,
          outletId,
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

        // Cloud open order is created once in addItemsToTable / sync — avoids duplicate opens.

        return bill;
      },

      addItemsToTable: async (table, allTables, items, source = 'pos', options) => {
        const fireKitchen = options?.fireKitchen !== false;
        const bill = get().ensureOpenBill(table, allTables, source);
        const outletId = resolveBillOutletId(bill.outletId || table.outletId);
        const nextItems = mergeItems(bill.items, items);
        let updated: TableBill = {
          ...bill,
          outletId,
          items: nextItems,
          source: bill.items.length === 0 ? source : bill.source,
          updatedAt: nowIso(),
        };

        set((s) => ({
          bills: s.bills.map((b) => (b.id === bill.id ? updated : b)),
          lastError: null,
        }));

        const cloudId = await upsertCloudOpenOrder(updated);
        if (!cloudId) {
          const msg =
            'Could not save the open bill to the server. Check connection / table billing schema.';
          set({ lastError: msg });
          if (source === 'qr') throw new Error(msg);
        } else {
          updated = { ...updated, cloudOrderId: cloudId };
          set((s) => ({
            bills: s.bills.map((b) => (b.id === updated.id ? updated : b)),
          }));
        }

        void useTableStore.getState().assignOrder(updated.tableId, updated.id);
        void useTableStore.getState().updateTableStatus(updated.tableId, 'occupied');

        if (fireKitchen) {
          const justAdded = mergeItems([], items);
          const ok = await get().fireKitchenTicket(updated.tableId, justAdded, source, {
            name: options?.guestName,
            email: options?.guestEmail,
          });
          if (!ok) {
            const msg =
              get().lastError ||
              'Order saved on the check, but kitchen did not receive it. Ask staff to send again.';
            if (source === 'qr') throw new Error(msg);
          }
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

        const updatedBill = { ...bill, items: nextItems, updatedAt: nowIso() };
        set((s) => ({
          bills: s.bills.map((b) => (b.id === bill.id ? updatedBill : b)),
          lastError: null,
        }));

        // Keep open-check lines in cloud after firing (staff devices hydrate from this)
        void upsertCloudOpenOrder(updatedBill).then((cloudId) => {
          if (!cloudId || cloudId === updatedBill.cloudOrderId) return;
          set((s) => ({
            bills: s.bills.map((b) => (b.id === updatedBill.id ? { ...b, cloudOrderId: cloudId } : b)),
          }));
        });

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
