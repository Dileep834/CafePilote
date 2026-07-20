import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bookmark,
  Bot,
  ChefHat,
  Clock,
  Eraser,
  History,
  Lightbulb,
  MessageSquarePlus,
  Package,
  Send,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { askAiAssistant } from '../services/aiAssistantService';
import { fetchExecutiveBi } from '../services/biService';
import { fetchLowStockItems } from '@/modules/ops/services/inventoryAutomationService';
import { supabase } from '@/lib/supabase';
import type { AiAssistantReply } from '../types';

type ChatTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reply?: AiAssistantReply;
  at: string;
};

type SavedChat = {
  id: string;
  title: string;
  turns: ChatTurn[];
  updatedAt: string;
};

const FAVORITE_PROMPTS = [
  "What were today's sales?",
  'Compare with yesterday',
  'What should I purchase tomorrow?',
  'Which products have the highest profit?',
  'Show low-stock items',
  'Show kitchen delays',
  'Show refund analysis',
  'Show customer insights',
];

const AI_SKILLS = [
  { id: 'sales', label: 'Sales & revenue', prompt: "What were today's sales?" },
  { id: 'purchase', label: 'Purchase advisor', prompt: 'What should I purchase tomorrow?' },
  { id: 'kitchen', label: 'Kitchen coach', prompt: 'Show kitchen delays' },
  { id: 'cost', label: 'Food cost', prompt: 'What is my food cost?' },
  { id: 'crm', label: 'Guest insights', prompt: 'Show customer insights' },
  { id: 'branch', label: 'Multi-outlet', prompt: 'Compare branches' },
];

const WELCOME: ChatTurn = {
  id: 'welcome',
  role: 'assistant',
  text: 'I am your CafePilots Restaurant Intelligence Assistant. Ask about sales, stock, kitchen, refunds, or guests — I will answer with KPIs, tables, and next actions.',
  at: new Date().toISOString(),
  reply: {
    intent: 'help',
    answer:
      'I am your CafePilots Restaurant Intelligence Assistant. Ask about sales, stock, kitchen, refunds, or guests — I will answer with KPIs, tables, and next actions.',
    suggestions: FAVORITE_PROMPTS.slice(0, 4),
  },
};

function uid() {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function MiniChart({ chart }: { chart: NonNullable<AiAssistantReply['chart']> }) {
  const data = chart.points.map((p) => ({ label: p.label, value: p.value }));
  return (
    <div className="mt-3 h-36 w-full rounded-[12px] bg-white p-2 ring-1 ring-slate-100">
      <p className="mb-1 px-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{chart.label}</p>
      <ResponsiveContainer width="100%" height="85%">
        {chart.type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
            <Line type="monotone" dataKey="value" stroke="#FF6A00" strokeWidth={2.5} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
            <Bar dataKey="value" fill="#0D1B2A" radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function AiCopilotPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const outlets = useTenantStore((s) => s.outlets);
  const companyId = getScopedCompanyId(user) || useTenantStore.getState().companyId;
  const outletId = getTenantOutletId(user) || useTenantStore.getState().activeOutletId;
  const outletName = outlets.find((o) => o.id === outletId)?.name || 'Active outlet';

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([WELCOME]);
  const [saved, setSaved] = useState<SavedChat[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [quick, setQuick] = useState({
    sales: 0,
    orders: 0,
    profit: 0,
    lowStock: 0,
    kitchen: 0,
    online: 0,
  });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastIntent = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i].role === 'assistant' && turns[i].reply?.intent) return turns[i].reply!.intent;
    }
    return null;
  }, [turns]);
  const lastUserQuery = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i].role === 'user') return turns[i].text;
    }
    return null;
  }, [turns]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy]);

  useEffect(() => {
    void (async () => {
      try {
        const bi = await fetchExecutiveBi({ companyId, outletId });
        const profit = Math.max(0, bi.todaySales - bi.foodCostEstimate - bi.refundsToday);
        let low = 0;
        let kitchen = 0;
        let online = 0;
        if (outletId && !outletId.startsWith('local')) {
          try {
            low = (await fetchLowStockItems(outletId)).length;
          } catch {
            low = 0;
          }
          try {
            const { count } = await supabase
              .from('pos_orders')
              .select('id', { count: 'exact', head: true })
              .eq('outlet_id', outletId)
              .neq('kitchen_status', 'delivered')
              .neq('status', 'held')
              .neq('status', 'open');
            kitchen = count || 0;
          } catch {
            kitchen = 0;
          }
          try {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const { data } = await supabase
              .from('pos_orders')
              .select('order_source')
              .eq('outlet_id', outletId)
              .gte('created_at', start.toISOString())
              .limit(300);
            online = (data || []).filter((o) =>
              ['swiggy', 'zomato', 'ondc', 'website', 'qr', 'whatsapp', 'phone', 'online'].includes(
                String(o.order_source || '').toLowerCase()
              )
            ).length;
          } catch {
            online = 0;
          }
        }
        setQuick({
          sales: bi.todaySales,
          orders: bi.orderCountToday,
          profit,
          lowStock: low,
          kitchen,
          online,
        });
        const peak = [...bi.hourly].sort((a, b) => b.sales - a.sales)[0];
        const foodPct = bi.todaySales > 0 ? (bi.foodCostEstimate / bi.todaySales) * 100 : 0;
        setInsights([
          `Sales today ${formatCurrency(bi.todaySales)} · ${bi.orderCountToday} orders`,
          low ? `${low} inventory alert(s) need attention` : 'Inventory alerts clear',
          foodPct > 35
            ? `Profit pressure — food cost ~${foodPct.toFixed(1)}%`
            : `Food cost ~${foodPct.toFixed(1)}% within band`,
          peak
            ? `Peak hour prediction ${String(peak.hour).padStart(2, '0')}:00`
            : 'Peak hour needs more tickets',
          bi.refundsToday > bi.todaySales * 0.08 && bi.todaySales > 0
            ? 'Refund anomaly — review remakes and voids'
            : 'Refund ratio looks controlled',
        ]);
      } catch {
        /* optional snapshot */
      }
    })();
  }, [companyId, outletId]);

  const ask = async (query: string) => {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput('');
    const userTurn: ChatTurn = { id: uid(), role: 'user', text: q, at: new Date().toISOString() };
    setTurns((t) => [...t, userTurn]);
    try {
      const reply = await askAiAssistant({
        query: q,
        companyId,
        outletId,
        userId: user?.id,
        previousIntent: lastIntent,
        previousQuery: lastUserQuery,
      });
      setTurns((t) => [
        ...t,
        {
          id: uid(),
          role: 'assistant',
          text: reply.answer,
          reply,
          at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setTurns((t) => [
        ...t,
        {
          id: uid(),
          role: 'assistant',
          text: (err as Error).message || 'Copilot failed',
          at: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    const title =
      turns.find((t) => t.role === 'user')?.text.slice(0, 36) ||
      `Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (turns.some((t) => t.role === 'user')) {
      setSaved((s) =>
        [{ id: uid(), title, turns, updatedAt: new Date().toISOString() }, ...s].slice(0, 12)
      );
    }
    setTurns([
      {
        ...WELCOME,
        id: uid(),
        at: new Date().toISOString(),
      },
    ]);
  };

  const clearChat = () => {
    setTurns([
      {
        ...WELCOME,
        id: uid(),
        at: new Date().toISOString(),
        text: 'Chat cleared. Ask a new restaurant operations question whenever you are ready.',
        reply: {
          intent: 'help',
          answer: 'Chat cleared. Ask a new restaurant operations question whenever you are ready.',
          suggestions: FAVORITE_PROMPTS.slice(0, 4),
        },
      },
    ]);
  };

  const runAction = (action: { id: string; label: string; href?: string }) => {
    if (action.href) {
      navigate(action.href);
      return;
    }
    if (action.id === 'compare') void ask('Compare with yesterday');
    if (action.id === 'export') {
      const blob = new Blob(
        [
          turns
            .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
            .join('\n\n'),
        ],
        { type: 'text/plain;charset=utf-8' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cafepilots-copilot-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const history = useMemo(
    () => turns.filter((t) => t.role === 'user').slice(-8).reverse(),
    [turns]
  );

  return (
    <div className="mx-auto flex h-[calc(100svh-5.5rem)] w-full max-w-[1600px] flex-col gap-3 lg:h-[calc(100svh-5rem)] lg:flex-row lg:gap-4">
      {/* LEFT PANEL */}
      <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-[12px] bg-[#0D1B2A] text-white shadow-sm lg:w-[300px] xl:w-[320px]">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-black">
            <Sparkles className="h-4 w-4 text-[#FF6A00]" />
            Restaurant Intelligence
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-white/50">Ops assistant · session memory on</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-wider text-white/40">
              <History className="h-3 w-3" />
              Conversation history
            </h3>
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => void ask(h.text)}
                    className="w-full truncate rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    {h.text}
                  </button>
                </li>
              ))}
              {!history.length && (
                <li className="px-2 py-2 text-[11px] text-white/40">Your questions will appear here</li>
              )}
            </ul>
          </section>

          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-wider text-white/40">
              <Bookmark className="h-3 w-3" />
              Saved chats
            </h3>
            <ul className="space-y-1">
              {saved.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setTurns(s.turns)}
                    className="w-full truncate rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    {s.title}
                  </button>
                </li>
              ))}
              {!saved.length && (
                <li className="px-2 py-2 text-[11px] text-white/40">New Chat saves the current thread</li>
              )}
            </ul>
          </section>

          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-wider text-white/40">
              <Star className="h-3 w-3" />
              Favorite prompts
            </h3>
            <div className="flex flex-col gap-1">
              {FAVORITE_PROMPTS.slice(0, 5).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(p)}
                  className="rounded-lg bg-white/5 px-2 py-1.5 text-left text-[11px] font-semibold text-orange-200 hover:bg-white/10"
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-wider text-white/40">
              <Zap className="h-3 w-3" />
              AI skills
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {AI_SKILLS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(s.prompt)}
                  className="rounded-[10px] bg-white/5 px-2 py-2 text-left text-[10px] font-bold text-white/90 ring-1 ring-white/10 hover:bg-white/10"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-wider text-white/40">
              <Lightbulb className="h-3 w-3" />
              Recent insights
            </h3>
            <ul className="space-y-1.5">
              {insights.map((ins) => (
                <li
                  key={ins}
                  className="rounded-[10px] bg-[#FF6A00]/10 px-2 py-1.5 text-[11px] font-medium leading-snug text-orange-100 ring-1 ring-[#FF6A00]/20"
                >
                  {ins}
                </li>
              ))}
              {!insights.length && (
                <li className="px-2 py-2 text-[11px] text-white/40">Loading live insights…</li>
              )}
            </ul>
          </section>
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-black text-slate-900 sm:text-xl">
              <Bot className="h-5 w-5 text-[#FF6A00]" />
              AI Copilot
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Store className="h-3.5 w-3.5" />
              {outletName}
              <span className="text-slate-300">·</span>
              Contextual session memory
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl" onClick={newChat}>
              <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
              New Chat
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl" onClick={clearChat}>
              <Eraser className="mr-1.5 h-3.5 w-3.5" />
              Clear Chat
            </Button>
          </div>
        </header>

        {/* Quick insight cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Today's Sales", value: formatCurrency(quick.sales), icon: Wallet, tone: 'text-orange-600 bg-orange-50' },
            { label: 'Orders', value: String(quick.orders), icon: TrendingUp, tone: 'text-sky-600 bg-sky-50' },
            { label: 'Profit', value: formatCurrency(quick.profit), icon: Sparkles, tone: 'text-emerald-600 bg-emerald-50' },
            { label: 'Inventory Alerts', value: String(quick.lowStock), icon: Package, tone: 'text-amber-700 bg-amber-50' },
            { label: 'Kitchen Queue', value: String(quick.kitchen), icon: ChefHat, tone: 'text-slate-700 bg-slate-100' },
            { label: 'Online Orders', value: String(quick.online), icon: AlertTriangle, tone: 'text-violet-700 bg-violet-50' },
          ].map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() =>
                void ask(
                  c.label.includes('Inventory')
                    ? 'Show low-stock items'
                    : c.label.includes('Kitchen')
                      ? 'Show kitchen delays'
                      : c.label.includes('Online')
                        ? 'Show customer insights'
                        : "What were today's sales?"
                )
              }
              className="rounded-[12px] bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={cn('mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg', c.tone)}>
                <c.icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{c.label}</p>
              <p className="truncate text-base font-black text-slate-900">{c.value}</p>
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_280px]">
          {/* Chat column */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[12px] bg-white shadow-sm ring-1 ring-slate-100">
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-3 py-2">
              {FAVORITE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(p)}
                  className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200"
                >
                  {p}
                </button>
              ))}
            </div>

            <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={cn('flex', turn.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[min(100%,640px)] rounded-2xl px-3.5 py-3 text-sm',
                      turn.role === 'user'
                        ? 'bg-[#0D1B2A] text-white'
                        : 'bg-slate-50 text-slate-800 ring-1 ring-slate-100'
                    )}
                  >
                    {turn.role === 'assistant' && (
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-[#FF6A00]">
                        <Bot className="h-3 w-3" />
                        CafePilots · {turn.reply?.intent?.replace(/_/g, ' ') || 'assistant'}
                      </p>
                    )}
                    <p className="font-medium leading-relaxed">{turn.text}</p>

                    {turn.reply?.kpis?.length ? (
                      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {turn.reply.kpis.map((k) => (
                          <div key={k.label} className="rounded-[10px] bg-white px-2 py-1.5 ring-1 ring-slate-100">
                            <p className="text-[9px] font-black uppercase text-slate-400">{k.label}</p>
                            <p className="truncate text-sm font-black text-slate-900">{k.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {turn.reply?.table ? (
                      <div className="mt-3 overflow-x-auto rounded-[10px] bg-white ring-1 ring-slate-100">
                        <table className="w-full min-w-[280px] text-left text-[11px]">
                          <thead className="bg-slate-50 text-[9px] uppercase text-slate-400">
                            <tr>
                              {turn.reply.table.columns.map((c) => (
                                <th key={c} className="px-2 py-1.5 font-black">
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {turn.reply.table.rows.map((row, i) => (
                              <tr key={i} className="border-t border-slate-50">
                                {row.map((cell, j) => (
                                  <td key={j} className="px-2 py-1.5 font-semibold text-slate-700">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}

                    {turn.reply?.chart ? <MiniChart chart={turn.reply.chart} /> : null}

                    {turn.reply?.recommendations?.length ? (
                      <ul className="mt-3 space-y-1">
                        {turn.reply.recommendations.map((r) => (
                          <li
                            key={r}
                            className="rounded-[10px] bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100"
                          >
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {turn.reply?.actions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {turn.reply.actions.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => runAction(a)}
                            className="rounded-lg bg-[#FF6A00] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#e55f00]"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {turn.reply?.suggestions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {turn.reply.suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={busy}
                            onClick={() => void ask(s)}
                            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 hover:text-orange-700"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(turn.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                    Analyzing outlet operations…
                  </div>
                </div>
              )}
            </div>

            <form
              className="flex gap-2 border-t border-slate-100 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your restaurant operations assistant…"
                className="h-11 flex-1 rounded-xl border-0 bg-slate-50 px-3 text-sm font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-orange-200"
                disabled={busy}
              />
              <Button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-11 rounded-xl bg-[#FF6A00] px-4 hover:bg-[#e55f00]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Insights side rail */}
          <aside className="hidden min-h-0 flex-col overflow-hidden rounded-[12px] bg-white shadow-sm ring-1 ring-slate-100 xl:flex">
            <div className="border-b border-slate-100 px-3 py-3">
              <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <Sparkles className="h-4 w-4 text-[#FF6A00]" />
                AI Insights
              </h2>
              <p className="text-[11px] font-medium text-slate-400">Live outlet watchlist</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {insights.map((ins, i) => (
                <div
                  key={ins}
                  className={cn(
                    'rounded-[12px] px-3 py-2.5 text-[11px] font-semibold leading-relaxed ring-1',
                    i % 2 === 0 ? 'bg-orange-50 text-orange-950 ring-orange-100' : 'bg-slate-50 text-slate-700 ring-slate-100'
                  )}
                >
                  {ins}
                </div>
              ))}
              <Link
                to="/erp/intelligence"
                className="block rounded-[12px] bg-[#0D1B2A] px-3 py-2.5 text-center text-[11px] font-bold text-white hover:opacity-90"
              >
                Open Executive BI
              </Link>
              <Link
                to="/erp/inventory"
                className="block rounded-[12px] bg-slate-100 px-3 py-2.5 text-center text-[11px] font-bold text-slate-700 hover:bg-slate-200"
              >
                Open Inventory
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
