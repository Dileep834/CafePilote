import { supabase } from '@/lib/supabase';
import type { AccountingProvider } from '../types';

export async function enqueueAccountingExport(params: {
  companyId: string;
  outletId?: string | null;
  provider: AccountingProvider;
  periodStart: string;
  periodEnd: string;
  userId?: string | null;
}): Promise<{ jobId: string }> {
  const { data, error } = await supabase
    .from('accounting_export_jobs')
    .insert([
      {
        company_id: params.companyId,
        outlet_id: params.outletId || null,
        provider: params.provider,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        status: 'queued',
        created_by: params.userId || null,
      },
    ])
    .select('id')
    .single();

  if (error) {
    throw new Error(
      error.message.includes('relation')
        ? 'Accounting export tables missing — run scripts/phase3_saas_schema.sql'
        : error.message
    );
  }

  // Generate CSV payload immediately for csv provider (others stay queued for workers)
  if (params.provider === 'csv') {
    try {
      let q = supabase
        .from('pos_orders')
        .select('id, created_at, total_amount, tax_amount, payment_method, status, outlet_id')
        .gte('created_at', `${params.periodStart}T00:00:00`)
        .lte('created_at', `${params.periodEnd}T23:59:59`)
        .neq('status', 'held');
      if (params.outletId) q = q.eq('outlet_id', params.outletId);
      const { data: rows } = await q.limit(5000);
      const header = 'date,order_id,outlet_id,amount,tax,payment,status';
      const lines = (rows || []).map(
        (r) =>
          `${String(r.created_at).slice(0, 10)},${r.id},${r.outlet_id || ''},${r.total_amount},${r.tax_amount || 0},${r.payment_method || ''},${r.status}`
      );
      const csv = [header, ...lines].join('\n');
      const blobUrl = `data:text/csv;base64,${btoa(unescape(encodeURIComponent(csv)))}`;
      await supabase
        .from('accounting_export_jobs')
        .update({ status: 'completed', file_url: blobUrl, completed_at: new Date().toISOString() })
        .eq('id', data.id);
    } catch (err) {
      await supabase
        .from('accounting_export_jobs')
        .update({ status: 'failed', error: (err as Error).message })
        .eq('id', data.id);
    }
  }

  return { jobId: data.id as string };
}

export async function listAccountingJobs(companyId: string) {
  const { data, error } = await supabase
    .from('accounting_export_jobs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) {
    if (error.message.includes('relation')) return [];
    throw error;
  }
  return data || [];
}
