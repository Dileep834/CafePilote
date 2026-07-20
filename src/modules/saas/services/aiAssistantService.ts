import { supabase } from '@/lib/supabase';
import { fetchExecutiveBi } from './biService';
import { fetchLowStockItems } from '@/modules/ops/services/inventoryAutomationService';
import type { AiAssistantReply } from '../types';

function matchIntent(q: string): string {
  const t = q.toLowerCase();
  if (/compare.*(yesterday|prior)|yesterday|vs\s*yesterday/.test(t)) return 'compare_yesterday';
  if (/today.?s?\s*sales|sales\s*today|how\s*much.*(sold|sales)/.test(t)) return 'sales_today';
  if (/week|weekly/.test(t) && /sales|revenue/.test(t)) return 'sales_week';
  if (/month|monthly/.test(t) && /sales|revenue/.test(t)) return 'sales_month';
  if (/food\s*cost|cogs|cost\s*of\s*goods/.test(t)) return 'food_cost';
  if (/low\s*stock|out\s*of\s*stock|show\s*low.?stock|what\s*should\s*i\s*purchase|purchase\s*tomorrow/.test(t))
    return 'purchase_suggest';
  if (/highest\s*profit|high\s*margin|profit(able)?\s*product/.test(t)) return 'high_profit';
  if (/losing\s*money|worst|low\s*margin|unprofitable/.test(t)) return 'losing_products';
  if (/best\s*seller|top\s*selling|popular/.test(t)) return 'best_sellers';
  if (/kitchen\s*delay|show\s*kitchen|kitchen\s*queue|prep\s*delay/.test(t)) return 'kitchen_delays';
  if (/customer\s*insight|guest\s*insight|retention|ltv/.test(t)) return 'customer_insights';
  if (/peak\s*hour|busy\s*hour|when.*(busy|peak)/.test(t)) return 'peak_hours';
  if (/branch|outlet|compare/.test(t)) return 'branch_compare';
  if (/refund/.test(t)) return 'refunds';
  if (/help|what\s*can\s*you/.test(t)) return 'help';
  return 'unknown';
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function resolveFollowUp(query: string, previousIntent?: string | null): string {
  const t = query.toLowerCase().trim();
  if (!previousIntent) return matchIntent(query);
  if (/^(and|also|what about|how about|same for|now)\b/.test(t) || t.length < 28) {
    if (/yesterday|prior|compare/.test(t)) return 'compare_yesterday';
    if (/week/.test(t)) return 'sales_week';
    if (/month/.test(t)) return 'sales_month';
    if (/refund/.test(t)) return 'refunds';
    if (/purchase|stock|buy/.test(t)) return 'purchase_suggest';
    if (/kitchen/.test(t)) return 'kitchen_delays';
    if (/profit/.test(t)) return 'high_profit';
    if (/peak|busy/.test(t)) return 'peak_hours';
    // short follow-up → stay near previous domain
    if (previousIntent.startsWith('sales') && /more|detail|break/.test(t)) return previousIntent;
  }
  return matchIntent(query);
}

/** Rule-based restaurant AI copilot — no external LLM required. */
export async function askAiAssistant(params: {
  query: string;
  companyId?: string | null;
  outletId?: string | null;
  userId?: string | null;
  /** Session context for follow-up questions */
  previousIntent?: string | null;
  previousQuery?: string | null;
}): Promise<AiAssistantReply> {
  const started = Date.now();
  const intent = resolveFollowUp(params.query, params.previousIntent);
  const bi = await fetchExecutiveBi({
    companyId: params.companyId,
    outletId: params.outletId,
  });

  const profit = Math.max(0, bi.todaySales - bi.foodCostEstimate - bi.refundsToday);
  const foodPct = bi.todaySales > 0 ? (bi.foodCostEstimate / bi.todaySales) * 100 : 0;

  let reply: AiAssistantReply;

  switch (intent) {
    case 'sales_today':
      reply = {
        intent,
        answer: `Today's sales are ${inr(bi.todaySales)} across ${bi.orderCountToday} orders (avg ticket ${inr(bi.avgTicketToday)}).`,
        data: { sales: bi.todaySales, orders: bi.orderCountToday, avgTicket: bi.avgTicketToday },
        kpis: [
          { label: "Today's Sales", value: inr(bi.todaySales) },
          { label: 'Orders', value: String(bi.orderCountToday) },
          { label: 'Avg Ticket', value: inr(bi.avgTicketToday) },
          { label: 'Profit est.', value: inr(profit) },
        ],
        chart: {
          type: 'bar',
          label: 'Sales by hour',
          points: bi.hourly
            .filter((h) => h.hour >= 10 && h.hour <= 22)
            .map((h) => ({ label: `${h.hour}`, value: h.sales })),
        },
        recommendations: [
          bi.orderCountToday < 10
            ? 'Volume is light — push a limited-time combo on POS and QR.'
            : 'Pace looks healthy — protect ticket size with upsells on top sellers.',
        ],
        actions: [
          { id: 'report', label: 'View Report', href: '/erp/reports' },
          { id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' },
          { id: 'export', label: 'Export PDF' },
          { id: 'compare', label: 'Compare Periods' },
        ],
        suggestions: ['Compare with yesterday', 'Show best sellers', 'What is my food cost?'],
      };
      break;
    case 'compare_yesterday': {
      const dailyAvg = bi.weekSales / 7;
      const delta = bi.todaySales - dailyAvg;
      const pct = dailyAvg > 0 ? (delta / dailyAvg) * 100 : 0;
      reply = {
        intent,
        answer: `Today ${inr(bi.todaySales)} vs ~${inr(dailyAvg)} daily average (7-day). ${
          pct >= 0 ? 'Up' : 'Down'
        } ${Math.abs(pct).toFixed(1)}% vs recent pace${
          params.previousIntent ? ` (following up on ${params.previousIntent.replace(/_/g, ' ')})` : ''
        }.`,
        kpis: [
          { label: 'Today', value: inr(bi.todaySales) },
          { label: '7d daily avg', value: inr(dailyAvg) },
          { label: 'Delta', value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` },
        ],
        chart: {
          type: 'line',
          label: 'Today vs average',
          points: [
            { label: 'Avg', value: Math.round(dailyAvg) },
            { label: 'Today', value: Math.round(bi.todaySales) },
          ],
        },
        recommendations: [
          pct < -10
            ? 'Soft day vs average — check weather, staffing, and online channel acceptance rate.'
            : 'At or above recent average — keep kitchen prep aligned to peak hours.',
        ],
        actions: [
          { id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' },
          { id: 'compare', label: 'Compare Periods' },
        ],
        suggestions: ["What were today's sales?", 'Show peak hours', 'Show refund analysis'],
      };
      break;
    }
    case 'sales_week':
      reply = {
        intent,
        answer: `Last 7 days sales: ${inr(bi.weekSales)}.`,
        data: { weekSales: bi.weekSales },
        kpis: [
          { label: '7-day sales', value: inr(bi.weekSales) },
          { label: 'Today', value: inr(bi.todaySales) },
        ],
        actions: [{ id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' }],
      };
      break;
    case 'sales_month':
      reply = {
        intent,
        answer: `Last 30 days sales: ${inr(bi.monthSales)}.`,
        data: { monthSales: bi.monthSales },
        kpis: [
          { label: '30-day sales', value: inr(bi.monthSales) },
          { label: '7-day sales', value: inr(bi.weekSales) },
        ],
        actions: [{ id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' }],
      };
      break;
    case 'food_cost':
      reply = {
        intent,
        answer:
          bi.foodCostEstimate > 0
            ? `Estimated food cost today (from inventory sale ledger): ${inr(bi.foodCostEstimate)} (${
                bi.todaySales > 0 ? `${foodPct.toFixed(1)}% of sales` : 'n/a'
              }).`
            : 'Food cost estimate needs Phase 1 inventory transactions with unit cost. Run recipes + sales first.',
        data: { foodCost: bi.foodCostEstimate, sales: bi.todaySales },
        kpis: [
          { label: 'Food cost', value: inr(bi.foodCostEstimate) },
          { label: 'Food cost %', value: `${foodPct.toFixed(1)}%` },
          { label: 'Sales', value: inr(bi.todaySales) },
        ],
        recommendations: [
          foodPct > 35
            ? 'Food cost is elevated — audit recipes on top 5 sellers and portion control.'
            : 'Food cost is within a healthy band for most QSR/cafe formats.',
        ],
        actions: [
          { id: 'inventory', label: 'Open Inventory', href: '/erp/inventory' },
          { id: 'recipes', label: 'View Recipes', href: '/erp/menu/recipes' },
        ],
      };
      break;
    case 'purchase_suggest': {
      let items: Awaited<ReturnType<typeof fetchLowStockItems>> = [];
      if (params.outletId && !params.outletId.startsWith('local')) {
        try {
          items = await fetchLowStockItems(params.outletId);
        } catch {
          items = [];
        }
      }
      reply = {
        intent,
        answer: items.length
          ? `Purchase suggestions (low stock): ${items
              .slice(0, 5)
              .map((i) => `${i.name} (${i.current}/${i.reorderLevel})`)
              .join(', ')}.`
          : 'No low-stock items found for this outlet (or inventory tables unavailable).',
        data: { items: items.slice(0, 10) },
        kpis: [{ label: 'Low stock SKUs', value: String(items.length) }],
        table: items.length
          ? {
              columns: ['Item', 'On hand', 'Reorder at'],
              rows: items.slice(0, 8).map((i) => [i.name, String(i.current), String(i.reorderLevel)]),
            }
          : undefined,
        recommendations: items.length
          ? ['Create a PO for critical SKUs before tomorrow’s prep.', 'Prefer FIFO batches on perishable lines.']
          : ['Review theoretical vs physical stock this week.'],
        actions: [
          { id: 'po', label: 'Create Purchase Order', href: '/erp/purchase' },
          { id: 'inventory', label: 'Open Inventory', href: '/erp/inventory' },
        ],
        suggestions: ["What were today's sales?", 'Show best sellers'],
      };
      break;
    }
    case 'high_profit':
      reply = {
        intent,
        answer: bi.topItems.length
          ? `Highest revenue products today (proxy for profit until recipe costs are complete): ${bi.topItems
              .slice(0, 5)
              .map((i) => `${i.name} ${inr(i.revenue)}`)
              .join('; ')}.`
          : 'No product sales yet to rank profit.',
        kpis: [
          { label: 'Top item', value: bi.topItems[0]?.name || '—' },
          { label: 'Revenue', value: inr(bi.topItems[0]?.revenue || 0) },
        ],
        table: bi.topItems.length
          ? {
              columns: ['Product', 'Qty', 'Revenue'],
              rows: bi.topItems.slice(0, 8).map((i) => [i.name, String(i.qty), inr(i.revenue)]),
            }
          : undefined,
        chart: {
          type: 'bar',
          label: 'Top revenue',
          points: bi.topItems.slice(0, 6).map((i) => ({ label: i.name.slice(0, 10), value: i.revenue })),
        },
        recommendations: ['Attach recipe costs to convert revenue rank into true margin rank.'],
        actions: [
          { id: 'recipes', label: 'View Recipes', href: '/erp/menu/recipes' },
          { id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' },
        ],
        suggestions: ['What is my food cost?', 'Show best sellers'],
      };
      break;
    case 'best_sellers':
      reply = {
        intent,
        answer: bi.topItems.length
          ? `Top sellers today: ${bi.topItems
              .slice(0, 5)
              .map((i) => `${i.name} (${i.qty} · ${inr(i.revenue)})`)
              .join('; ')}.`
          : 'No item sales recorded yet today.',
        data: { topItems: bi.topItems },
        table: bi.topItems.length
          ? {
              columns: ['Product', 'Qty', 'Revenue'],
              rows: bi.topItems.map((i) => [i.name, String(i.qty), inr(i.revenue)]),
            }
          : undefined,
        chart: {
          type: 'bar',
          label: 'Top sellers',
          points: bi.topItems.slice(0, 6).map((i) => ({ label: i.name.slice(0, 10), value: i.qty })),
        },
        actions: [{ id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' }],
      };
      break;
    case 'losing_products':
      reply = {
        intent,
        answer:
          'Margin loss detection needs recipe cost + sale price variance. Use Recipes + food costing modules; Phase 3 will flag items where cost > 40% of price once unit costs are populated.',
        recommendations: ['Complete BOM on top 20 SKUs.', 'Run a weekly recipe cost vs menu price check.'],
        actions: [
          { id: 'recipes', label: 'View Recipes', href: '/erp/menu/recipes' },
          { id: 'inventory', label: 'Open Inventory', href: '/erp/inventory' },
        ],
        suggestions: ['What is my food cost?', 'Show best sellers'],
      };
      break;
    case 'kitchen_delays': {
      let queue = 0;
      try {
        let kq = supabase
          .from('pos_orders')
          .select('id', { count: 'exact', head: true })
          .neq('kitchen_status', 'delivered')
          .neq('status', 'held')
          .neq('status', 'open');
        if (params.outletId && !params.outletId.startsWith('local')) {
          kq = kq.eq('outlet_id', params.outletId);
        }
        const { count } = await kq;
        queue = count || 0;
      } catch {
        queue = 0;
      }
      const peak = [...bi.hourly].sort((a, b) => b.orders - a.orders)[0];
      reply = {
        intent,
        answer: `Kitchen has ${queue} active ticket(s). Peak order hour today is ${
          peak ? `${String(peak.hour).padStart(2, '0')}:00 (${peak.orders} orders)` : 'not yet clear'
        }.`,
        kpis: [
          { label: 'Kitchen queue', value: String(queue) },
          { label: 'Peak hour', value: peak ? `${String(peak.hour).padStart(2, '0')}:00` : '—' },
        ],
        recommendations: [
          queue > 12
            ? 'Queue is elevated — bump delayed tickets and stagger fire courses.'
            : 'Queue looks manageable — keep station routing tight into peak.',
        ],
        actions: [
          { id: 'kitchen', label: 'Open Kitchen', href: '/erp/kitchen' },
          { id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' },
        ],
        suggestions: ['Show peak hours', "What were today's sales?"],
      };
      break;
    }
    case 'customer_insights':
      reply = {
        intent,
        answer: `Today’s guest activity: ${bi.orderCountToday} orders, avg ticket ${inr(
          bi.avgTicketToday
        )}. Use CRM for LTV and favorites — attach phones at checkout to unlock retention insights.`,
        kpis: [
          { label: 'Orders', value: String(bi.orderCountToday) },
          { label: 'Avg ticket', value: inr(bi.avgTicketToday) },
        ],
        recommendations: [
          'Capture guest phone on large tickets for loyalty earn.',
          'Review CRM segments after dinner rush.',
        ],
        actions: [
          { id: 'crm', label: 'Open Customer', href: '/erp/crm' },
          { id: 'vouchers', label: 'Offers & vouchers', href: '/erp/vouchers' },
        ],
        suggestions: ['Show best sellers', 'Show refund analysis'],
      };
      break;
    case 'peak_hours': {
      const peak = [...bi.hourly].sort((a, b) => b.sales - a.sales)[0];
      reply = {
        intent,
        answer: peak
          ? `Peak hour today is ${String(peak.hour).padStart(2, '0')}:00 with ${inr(peak.sales)} (${peak.orders} orders).`
          : 'Not enough hourly data yet.',
        data: { peak, hourly: bi.hourly.filter((h) => h.orders > 0) },
        chart: {
          type: 'bar',
          label: 'Hourly sales',
          points: bi.hourly
            .filter((h) => h.hour >= 9 && h.hour <= 22)
            .map((h) => ({ label: `${h.hour}`, value: h.sales })),
        },
        recommendations: [
          peak
            ? `Staff the floor 30–45 minutes before ${String(peak.hour).padStart(2, '0')}:00 tomorrow.`
            : 'Collect a full service day to predict peaks.',
        ],
        actions: [{ id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' }],
      };
      break;
    }
    case 'branch_compare':
      reply = {
        intent,
        answer: bi.branches.length
          ? `Branch ranking today: ${bi.branches
              .slice(0, 5)
              .map((b, i) => `${i + 1}. ${b.outletName} ${inr(b.sales)}`)
              .join(' · ')}.`
          : 'No branch comparison available for this company.',
        data: { branches: bi.branches },
        table: bi.branches.length
          ? {
              columns: ['Outlet', 'Sales', 'Orders', 'Avg'],
              rows: bi.branches
                .slice(0, 8)
                .map((b) => [b.outletName, inr(b.sales), String(b.orders), inr(b.avgTicket)]),
            }
          : undefined,
        chart: {
          type: 'bar',
          label: 'Branch sales',
          points: bi.branches.slice(0, 6).map((b) => ({
            label: b.outletName.slice(0, 10),
            value: b.sales,
          })),
        },
        actions: [
          { id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' },
          { id: 'franchise', label: 'Outlets', href: '/erp/franchise' },
        ],
      };
      break;
    case 'refunds':
      reply = {
        intent,
        answer: `Refunds / cancelled value today: ${inr(bi.refundsToday)}.`,
        data: { refunds: bi.refundsToday },
        kpis: [
          { label: 'Refunds', value: inr(bi.refundsToday) },
          {
            label: 'Refund %',
            value: `${bi.todaySales > 0 ? ((bi.refundsToday / bi.todaySales) * 100).toFixed(1) : 0}%`,
          },
        ],
        recommendations: [
          bi.refundsToday > bi.todaySales * 0.08 && bi.todaySales > 0
            ? 'Refund ratio is elevated — review reasons and kitchen remakes.'
            : 'Refund ratio looks controlled.',
        ],
        actions: [
          { id: 'refunds', label: 'Open Refunds', href: '/erp/refunds' },
          { id: 'audit', label: 'Audit log', href: '/erp/audit' },
        ],
        suggestions: ["What were today's sales?", 'Show kitchen delays'],
      };
      break;
    case 'help':
      reply = {
        intent,
        answer:
          'I am your CafePilots restaurant operations assistant. Ask about sales, purchases, kitchen, refunds, customers, peak hours, or branch performance.',
        suggestions: [
          "What were today's sales?",
          'What should I purchase tomorrow?',
          'Show kitchen delays',
          'Show refund analysis',
        ],
        actions: [{ id: 'bi', label: 'Open Executive BI', href: '/erp/intelligence' }],
      };
      break;
    default:
      reply = {
        intent: 'unknown',
        answer:
          "I couldn't map that query yet. Try a restaurant ops prompt below — or ask about today's sales, purchases, kitchen, or refunds.",
        suggestions: ["What were today's sales?", 'Show low-stock items', 'Help'],
      };
  }

  try {
    await supabase.from('ai_query_logs').insert([
      {
        company_id: params.companyId || null,
        outlet_id: params.outletId || null,
        user_id: params.userId || null,
        query_text: params.query,
        intent: reply.intent,
        response_summary: reply.answer.slice(0, 500),
        latency_ms: Date.now() - started,
      },
    ]);
  } catch {
    /* optional */
  }

  return reply;
}
