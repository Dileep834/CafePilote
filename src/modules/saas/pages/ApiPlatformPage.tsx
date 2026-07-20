import { useEffect, useState } from 'react';
import { Copy, KeyRound, Plus, Trash2, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import {
  createApiKey,
  createWebhook,
  listApiKeys,
  listWebhooks,
  revokeApiKey,
  type ApiKeyRow,
} from '../services/apiPlatformService';

export function ApiPlatformPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = getScopedCompanyId(user) || useTenantStore.getState().companyId;
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [hooks, setHooks] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('Partner integration');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    if (!companyId) {
      setError('Select a company / branch context first');
      return;
    }
    setError('');
    try {
      setKeys(await listApiKeys(companyId));
      setHooks(await listWebhooks(companyId));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, [companyId]);

  const onCreateKey = async () => {
    if (!companyId) return;
    setMsg('');
    setPlaintext(null);
    try {
      const { row, plaintext: secret } = await createApiKey({
        companyId,
        name: name || 'API key',
        createdBy: user?.id,
      });
      setPlaintext(secret);
      setKeys((k) => [row, ...k]);
      setMsg('Copy the key now — it will not be shown again.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onCreateHook = async () => {
    if (!companyId || !webhookUrl.trim()) return;
    try {
      await createWebhook({ companyId, url: webhookUrl.trim() });
      setWebhookUrl('');
      setMsg('Webhook endpoint saved');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
          <KeyRound className="h-5 w-5 text-orange-500" />
          Open API Platform
        </h1>
        <p className="text-xs text-slate-500">
          API keys, scopes, webhooks — public REST gateway ships next; keys are stored hashed
        </p>
      </div>

      {error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}
      {msg && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{msg}</p>}

      {plaintext && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
          <p className="text-[10px] font-black uppercase text-orange-700">New secret (once)</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all text-xs font-bold text-slate-900">{plaintext}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(plaintext)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-sm font-black text-slate-900">Create API key</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Key name"
          />
          <Button type="button" className="bg-orange-500 hover:bg-orange-600" onClick={() => void onCreateKey()}>
            <Plus className="mr-1 h-4 w-4" />
            Create
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{k.name}</p>
                <p className="font-mono text-[10px] text-slate-500">
                  {k.key_prefix}… · {(k.scopes || []).join(', ') || 'no scopes'}
                  {k.revoked_at ? ' · REVOKED' : ''}
                </p>
              </div>
              {!k.revoked_at && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={async () => {
                    await revokeApiKey(k.id);
                    await load();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
          {!keys.length && <li className="py-4 text-center text-slate-400">No API keys yet</li>}
        </ul>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-900">
          <Webhook className="h-4 w-4" />
          Webhooks
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="https://partner.example/webhooks/cafepilots"
          />
          <Button type="button" variant="outline" onClick={() => void onCreateHook()}>
            Add
          </Button>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
          {hooks.map((h) => (
            <li key={String(h.id)} className="truncate font-mono">
              {String(h.url)} · {h.is_active ? 'active' : 'off'}
            </li>
          ))}
          {!hooks.length && <li className="text-slate-400">No webhooks</li>}
        </ul>
        <p className="mt-3 text-[11px] text-slate-500">
          Docs: Orders, Products, Inventory, Customers, Tables, Kitchen, Reports — authenticate with{' '}
          <code className="rounded bg-slate-100 px-1">Authorization: Bearer cp_live_…</code>
        </p>
      </div>
    </div>
  );
}
