import { supabase } from '@/lib/supabase';
import type { ExecutiveBiSummary, BranchComparisonRow } from '../types';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

async function sumSales(params: {
  outletIds?: string[] | null;
  from: Date;
  to?: Date;
}): Promise<{ sales: number; orders: number; refunds: number }> {
  let q = supabase
    .from('pos_orders')
    .select('id, total_amount, status, created_at, outlet_id')
    .gte('created_at', params.from.toISOString())
    .neq('status', 'held')
    .neq('status', 'open');

  if (params.to) q = q.lt('created_at', params.to.toISOString());
  if (params.outletIds?.length) q = q.in('outlet_id', params.outletIds);

  const { data, error } = await q;
  if (error) throw error;

  let sales = 0;
  let orders = 0;
  let refunds = 0;
  for (const row of data || []) {
    const amt = Number(row.total_amount || 0);
    if (row.status === 'cancelled' || row.status === 'refunded') {
      refunds += Math.abs(amt);
      continue;
    }
    sales += amt;
    orders += 1;
  }
  return { sales, orders, refunds };
}

/** Live executive BI from operational tables (no warehouse required). */
export async function fetchExecutiveBi(params: {
  companyId?: string | null;
  outletId?: string | null;
  outletIds?: string[];
}): Promise<ExecutiveBiSummary> {
  const outletIds =
    params.outletIds?.length
      ? params.outletIds
      : params.outletId && params.outletId !== 'current-outlet' && !params.outletId.startsWith('local')
        ? [params.outletId]
        : undefined;

  const today = startOfDay();
  const week = daysAgo(6);
  const month = daysAgo(29);

  const [t, w, m] = await Promise.all([
    sumSales({ outletIds, from: today }),
    sumSales({ outletIds, from: week }),
    sumSales({ outletIds, from: month }),
  ]);

  // Top items today
  let topItems: ExecutiveBiSummary['topItems'] = [];
  try {
    let orderQ = supabase
      .from('pos_orders')
      .select('id')
      .gte('created_at', today.toISOString())
      .neq('status', 'held')
      .neq('status', 'open')
      .neq('status', 'cancelled');
    if (outletIds?.length) orderQ = orderQ.in('outlet_id', outletIds);
    const { data: orderRows } = await orderQ.limit(500);
    const ids = (orderRows || []).map((r) => r.id);
    if (ids.length) {
      const { data: items } = await supabase
        .from('pos_order_items')
        .select('product_name, quantity, total_price')
        .in('order_id', ids);
      const map = new Map<string, { qty: number; revenue: number }>();
      for (const it of items || []) {
        const name = String(it.product_name || 'Item');
        const cur = map.get(name) || { qty: 0, revenue: 0 };
        cur.qty += Number(it.quantity || 0);
        cur.revenue += Number(it.total_price || 0);
        map.set(name, cur);
      }
      topItems = [...map.entries()]
        .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);
    }
  } catch {
    topItems = [];
  }

  // Hourly sales today
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, sales: 0, orders: 0 }));
  try {
    let hq = supabase
      .from('pos_orders')
      .select('total_amount, created_at, status')
      .gte('created_at', today.toISOString())
      .neq('status', 'held')
      .neq('status', 'open');
    if (outletIds?.length) hq = hq.in('outlet_id', outletIds);
    const { data: rows } = await hq;
    for (const row of rows || []) {
      if (row.status === 'cancelled' || row.status === 'refunded') continue;
      const h = new Date(row.created_at).getHours();
      hourly[h].sales += Number(row.total_amount || 0);
      hourly[h].orders += 1;
    }
  } catch {
    /* ignore */
  }

  // Branch comparison (company scope)
  let branches: BranchComparisonRow[] = [];
  try {
    let outletsQ = supabase.from('outlets').select('id, name').eq('is_active', true);
    if (params.companyId) outletsQ = outletsQ.eq('company_id', params.companyId);
    const { data: outlets } = await outletsQ.limit(40);
    if (outlets?.length) {
      const comps = await Promise.all(
        outlets.map(async (o) => {
          const s = await sumSales({ outletIds: [o.id], from: today });
          return {
            outletId: o.id,
            outletName: o.name,
            sales: s.sales,
            orders: s.orders,
            avgTicket: s.orders ? s.sales / s.orders : 0,
            refunds: s.refunds,
          };
        })
      );
      branches = comps.sort((a, b) => b.sales - a.sales);
    }
  } catch {
    branches = [];
  }

  // Food cost estimate from inventory sale movements today
  let foodCostEstimate = 0;
  try {
    if (outletIds?.length === 1) {
      const { data } = await supabase
        .from('inventory_transactions')
        .select('quantity_delta, unit_cost')
        .eq('outlet_id', outletIds[0])
        .eq('movement_type', 'sale')
        .gte('created_at', today.toISOString());
      for (const row of data || []) {
        foodCostEstimate += Math.abs(Number(row.quantity_delta || 0)) * Number(row.unit_cost || 0);
      }
    }
  } catch {
    foodCostEstimate = 0;
  }

  return {
    todaySales: t.sales,
    weekSales: w.sales,
    monthSales: m.sales,
    orderCountToday: t.orders,
    avgTicketToday: t.orders ? t.sales / t.orders : 0,
    refundsToday: t.refunds,
    topItems,
    hourly,
    branches,
    foodCostEstimate,
    generatedAt: new Date().toISOString(),
  };
}

export async function persistBiSnapshot(params: {
  companyId?: string | null;
  outletId?: string | null;
  summary: ExecutiveBiSummary;
}): Promise<void> {
  try {
    await supabase.from('bi_daily_snapshots').upsert(
      [
        {
          company_id: params.companyId || null,
          outlet_id: params.outletId || null,
          snapshot_date: new Date().toISOString().slice(0, 10),
          gross_sales: params.summary.todaySales,
          net_sales: Math.max(0, params.summary.todaySales - params.summary.refundsToday),
          order_count: params.summary.orderCountToday,
          avg_ticket: params.summary.avgTicketToday,
          refunds: params.summary.refundsToday,
          food_cost: params.summary.foodCostEstimate,
          meta: { topItems: params.summary.topItems.slice(0, 5) },
        },
      ],
      { onConflict: 'company_id,outlet_id,snapshot_date' }
    );
  } catch {
    /* optional table */
  }
}
