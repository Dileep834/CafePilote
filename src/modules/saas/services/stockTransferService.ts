import { supabase } from '@/lib/supabase';
import { applyInventoryDelta } from '@/modules/ops/services/inventoryLedgerService';
import { writeAuditLog } from '@/modules/ops/services/auditService';
import type { StockTransferStatus } from '../types';

export async function createStockTransfer(params: {
  companyId?: string | null;
  fromOutletId: string;
  toOutletId: string;
  items: Array<{ productId: string; quantity: number; unitCost?: number }>;
  notes?: string;
  userId?: string | null;
}): Promise<{ transferId: string }> {
  if (params.fromOutletId === params.toOutletId) {
    throw new Error('Source and destination outlets must differ');
  }

  const { data, error } = await supabase
    .from('stock_transfers')
    .insert([
      {
        company_id: params.companyId || null,
        from_outlet_id: params.fromOutletId,
        to_outlet_id: params.toOutletId,
        status: 'requested',
        notes: params.notes || null,
        requested_by: params.userId || null,
      },
    ])
    .select('id')
    .single();

  if (error) {
    throw new Error(
      error.message.includes('relation')
        ? 'Stock transfer tables missing — run scripts/phase3_saas_schema.sql'
        : error.message
    );
  }

  const transferId = data.id as string;
  await supabase.from('stock_transfer_items').insert(
    params.items.map((i) => ({
      transfer_id: transferId,
      product_id: i.productId,
      quantity: i.quantity,
      unit_cost: i.unitCost ?? null,
    }))
  );

  await writeAuditLog({
    outletId: params.fromOutletId,
    userId: params.userId,
    action: 'stock_adjustment',
    entityType: 'stock_transfer',
    entityId: transferId,
    newValue: { to: params.toOutletId, lines: params.items.length },
  });

  return { transferId };
}

export async function updateStockTransferStatus(params: {
  transferId: string;
  status: StockTransferStatus;
  userId?: string | null;
}): Promise<void> {
  const { data: transfer, error } = await supabase
    .from('stock_transfers')
    .select('*, items:stock_transfer_items(*)')
    .eq('id', params.transferId)
    .single();
  if (error) throw error;

  const { error: upErr } = await supabase
    .from('stock_transfers')
    .update({
      status: params.status,
      updated_at: new Date().toISOString(),
      approved_by: params.status === 'approved' ? params.userId || null : undefined,
    })
    .eq('id', params.transferId);
  if (upErr) throw upErr;

  // On receive: move stock from → to via ledger
  if (params.status === 'received') {
    const items = (transfer.items || []) as Array<{
      product_id: string;
      quantity: number;
      unit_cost?: number;
    }>;
    for (const item of items) {
      await applyInventoryDelta({
        outletId: transfer.from_outlet_id,
        productId: item.product_id,
        movementType: 'transfer_out',
        quantityDelta: -Math.abs(Number(item.quantity)),
        referenceType: 'stock_transfer',
        referenceId: params.transferId,
        notes: 'Inter-store transfer out',
        createdBy: params.userId,
      });
      await applyInventoryDelta({
        outletId: transfer.to_outlet_id,
        productId: item.product_id,
        movementType: 'transfer_in',
        quantityDelta: Math.abs(Number(item.quantity)),
        referenceType: 'stock_transfer',
        referenceId: params.transferId,
        notes: 'Inter-store transfer in',
        createdBy: params.userId,
      });
    }
  }
}

export async function listStockTransfers(companyId?: string | null) {
  let q = supabase
    .from('stock_transfers')
    .select('*, items:stock_transfer_items(*)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) {
    if (error.message.includes('relation')) return [];
    throw error;
  }
  return data || [];
}
