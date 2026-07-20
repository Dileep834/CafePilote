import { supabase } from '@/lib/supabase';
import { DEFAULT_API_SCOPES, type ApiScope } from '../types';

function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

export type ApiKeyRow = {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_min: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

/** Create API key — returns plaintext once. */
export async function createApiKey(params: {
  companyId: string;
  name: string;
  scopes?: ApiScope[];
  rateLimitPerMin?: number;
  createdBy?: string | null;
}): Promise<{ row: ApiKeyRow; plaintext: string }> {
  const secret = randomToken(32);
  const plaintext = `cp_live_${secret}`;
  const key_prefix = plaintext.slice(0, 12);
  const key_hash = await sha256Hex(plaintext);

  const { data, error } = await supabase
    .from('api_keys')
    .insert([
      {
        company_id: params.companyId,
        name: params.name,
        key_prefix,
        key_hash,
        scopes: params.scopes || DEFAULT_API_SCOPES,
        rate_limit_per_min: params.rateLimitPerMin ?? 60,
        created_by: params.createdBy || null,
      },
    ])
    .select('id, company_id, name, key_prefix, scopes, rate_limit_per_min, last_used_at, revoked_at, created_at')
    .single();

  if (error) {
    throw new Error(
      error.message.includes('relation')
        ? 'API keys table missing — run scripts/phase3_saas_schema.sql'
        : error.message
    );
  }

  return { row: data as ApiKeyRow, plaintext };
}

export async function listApiKeys(companyId: string): Promise<ApiKeyRow[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, company_id, name, key_prefix, scopes, rate_limit_per_min, last_used_at, revoked_at, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) {
    if (error.message.includes('relation')) return [];
    throw error;
  }
  return (data || []) as ApiKeyRow[];
}

export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function listWebhooks(companyId: string) {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) {
    if (error.message.includes('relation')) return [];
    throw error;
  }
  return data || [];
}

export async function createWebhook(params: {
  companyId: string;
  url: string;
  events?: string[];
}): Promise<void> {
  const { error } = await supabase.from('webhook_endpoints').insert([
    {
      company_id: params.companyId,
      url: params.url,
      secret: `whsec_${randomToken(16)}`,
      events: params.events || ['order.created', 'order.updated', 'inventory.low'],
      is_active: true,
    },
  ]);
  if (error) {
    throw new Error(
      error.message.includes('relation')
        ? 'Webhook tables missing — run scripts/phase3_saas_schema.sql'
        : error.message
    );
  }
}
