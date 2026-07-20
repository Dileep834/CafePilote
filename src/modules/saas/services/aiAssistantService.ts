import { supabase } from '@/lib/supabase';
import { fetchExecutiveBi } from './biService';
import { fetchLowStockItems } from '@/modules/ops/services/inventoryAutomationService';
import type { AiAssistantReply } from '../types';

function matchIntent(q: string): string {
  const t = q.toLowerCase();
  if (/today.?s?\s*sales|sales\s*today|how\s*much.*(sold|sales)/.test(t)) return 'sales_today';
  if (/week|weekly/.test(t) && /sales|revenue/.test(t)) return 'sales_week';
  if (/month|monthly/.test(t) && /sales|revenue/.test(t)) return 'sales_month';
  if (/food\s*cost|cogs|cost\s*of\s*goods/.test(t)) return 'food_cost';
  if (/low\s*stock|out\s*of\s*stock|what\s*should\s*i\s*purchase|purchase\s*tomorrow/.test(t))
    return 'purchase_suggest';
  if (/losing\s*money|worst|low\s*margin|unprofitable/.test(t)) return 'losing_products';
  if (/best\s*seller|top\s*selling|popular/.test(t)) return 'best_sellers';
  if (/peak\s*hour|busy\s*hour|when.*(busy|peak)/.test(t)) return 'peak_hours';
  if (/branch|outlet|compare/.test(t)) return 'branch_compare';
  if (/refund/.test(t)) return 'refunds';
  if (/help|what\s*can\s*you/.test(t)) return 'help';
  return 'unknown';
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Rule-based restaurant AI copilot — no external LLM required. */
export async function askAiAssistant(params: {
  query: string;
  companyId?: string | null;
  outletId?: string | null;
  userId?: string | null;
}): Promise<AiAssistantReply> {
  const started = Date.now();
  const intent = matchIntent(params.query);
  const bi = await fetchExecutiveBi({
    companyId: params.companyId,
    outletId: params.outletId,
  });

  let reply: AiAssistantReply;

  switch (intent) {
    case 'sales_today':
      reply = {
        intent,
        answer: `Today's sales are ${inr(bi.todaySales)} across ${bi.orderCountToday} orders (avg ticket ${inr(bi.avgTicketToday)}).`,
        data: { sales: bi.todaySales, orders: bi.orderCountToday, avgTicket: bi.avgTicketToday },
        suggestions: ['What is my food cost?', 'Show best sellers', 'Compare branches'],
      };
      break;
    case 'sales_week':
      reply = {
        intent,
        answer: `Last 7 days sales: ${inr(bi.weekSales)}.`,
        data: { weekSales: bi.weekSales },
      };
      break;
    case 'sales_month':
      reply = {
        intent,
        answer: `Last 30 days sales: ${inr(bi.monthSales)}.`,
        data: { monthSales: bi.monthSales },
      };
      break;
    case 'food_cost':
      reply = {
        intent,
        answer:
          bi.foodCostEstimate > 0
            ? `Estimated food cost today (from inventory sale ledger): ${inr(bi.foodCostEstimate)} (${
                bi.todaySales > 0
                  ? `${((bi.foodCostEstimate / bi.todaySales) * 100).toFixed(1)}% of sales`
                  : 'n/a'
              }).`
            : 'Food cost estimate needs Phase 1 inventory transactions with unit cost. Run recipes + sales first.',
        data: { foodCost: bi.foodCostEstimate, sales: bi.todaySales },
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
        suggestions: ["What were today's sales?", 'Show best sellers'],
      };
      break;
    }
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
      };
      break;
    case 'losing_products':
      reply = {
        intent,
        answer:
          'Margin loss detection needs recipe cost + sale price variance. Use Recipes + food costing modules; Phase 3 will flag items where cost > 40% of price once unit costs are populated.',
        suggestions: ['What is my food cost?', 'Show best sellers'],
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
      };
      break;
    case 'refunds':
      reply = {
        intent,
        answer: `Refunds / cancelled value today: ${inr(bi.refundsToday)}.`,
        data: { refunds: bi.refundsToday },
      };
      break;
    case 'help':
      reply = {
        intent,
        answer:
          'Ask about today/week/month sales, food cost, best sellers, peak hours, branch compare, low stock / purchase suggestions, or refunds.',
        suggestions: [
          "What were today's sales?",
          'What should I purchase tomorrow?',
          'What is my food cost?',
          'Compare branches',
        ],
      };
      break;
    default:
      reply = {
        intent: 'unknown',
        answer:
          "I couldn't map that query yet. Try: \"What were today's sales?\", \"What should I purchase tomorrow?\", or \"Compare branches\".",
        suggestions: ["What were today's sales?", 'Show best sellers', 'Help'],
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
