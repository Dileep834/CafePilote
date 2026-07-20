import { useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { cn } from '@/lib/utils';
import { askAiAssistant } from '../services/aiAssistantService';
import type { AiAssistantReply } from '../types';

type ChatTurn = { role: 'user' | 'assistant'; text: string; intent?: string };

const STARTERS = [
  "What were today's sales?",
  'What should I purchase tomorrow?',
  'What is my food cost?',
  'Show best sellers',
  'Compare branches',
];

export function AiCopilotPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = getScopedCompanyId(user) || useTenantStore.getState().companyId;
  const outletId = getTenantOutletId(user) || useTenantStore.getState().activeOutletId;
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      text: 'CafePilots Copilot ready. Ask about sales, food cost, purchases, peak hours, or branch performance.',
      intent: 'help',
    },
  ]);

  const ask = async (query: string) => {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput('');
    setTurns((t) => [...t, { role: 'user', text: q }]);
    try {
      const reply: AiAssistantReply = await askAiAssistant({
        query: q,
        companyId,
        outletId,
        userId: user?.id,
      });
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: reply.answer, intent: reply.intent },
      ]);
      if (reply.suggestions?.length) {
        /* suggestions rendered from last reply via STARTERS + reply */
      }
    } catch (err) {
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: (err as Error).message || 'Copilot failed', intent: 'error' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
          <Bot className="h-5 w-5 text-orange-500" />
          AI Copilot
        </h1>
        <p className="text-xs text-slate-500">
          Natural-language ops assistant (rule-based Phase 3 foundation — LLM optional later)
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void ask(s)}
            className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {turns.map((turn, idx) => (
            <div
              key={`${idx}-${turn.role}`}
              className={cn('flex', turn.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  turn.role === 'user'
                    ? 'bg-[#0D1B2A] text-white'
                    : 'bg-slate-50 text-slate-800 ring-1 ring-slate-100'
                )}
              >
                <p className="font-medium leading-relaxed">{turn.text}</p>
                {turn.intent && turn.role === 'assistant' && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {turn.intent.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            </div>
          ))}
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
            placeholder="Ask CafePilots…"
            className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !input.trim()} className="bg-orange-500 hover:bg-orange-600">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
