import { supabase } from '@/lib/supabase';
import { applyInventoryDelta } from '@/modules/ops/services/inventoryLedgerService';
import { writeAuditLog } from '@/modules/ops/services/auditService';
import { pushAppNotification } from '@/modules/ops/services/notificationService';

export type GrnItemInput = {
  productId: string;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: string;
};

/** Create GRN and update stock (Phase 2 purchase receive formalization) */
export async function createGrn(params: {
  outletId: string;
  poId?: string | null;
  supplierId?: string | null;
  items: GrnItemInput[];
  notes?: string;
  userId?: string | null;
}): Promise<{ grnId: string }> {
  const { data: grn, error } = await supabase
    .from('purchase_grn')
    .insert([
      {
        outlet_id: params.outletId,
        po_id: params.poId || null,
        supplier_id: params.supplierId || null,
        status: 'received',
        notes: params.notes || null,
        received_by: params.userId || null,
      },
    ])
    .select('id')
    .single();

  if (error) {
    throw new Error(
      error.message.includes('relation')
        ? 'GRN tables missing — run scripts/phase2_enterprise_schema.sql'
        : error.message
    );
  }

  const grnId = grn.id as string;
  await supabase.from('purchase_grn_items').insert(
    params.items.map((i) => ({
      grn_id: grnId,
      product_id: i.productId,
      quantity: i.quantity,
      unit_cost: i.unitCost ?? null,
      batch_number: i.batchNumber || null,
      expiry_date: i.expiryDate || null,
    }))
  );

  for (const item of params.items) {
    await applyInventoryDelta({
      outletId: params.outletId,
      productId: item.productId,
      movementType: 'purchase',
      quantityDelta: item.quantity,
      referenceType: 'grn',
      referenceId: grnId,
      notes: 'GRN receive',
      createdBy: params.userId,
    });
  }

  await writeAuditLog({
    outletId: params.outletId,
    userId: params.userId,
    action: 'purchase_edit',
    entityType: 'grn',
    entityId: grnId,
    newValue: { items: params.items.length, poId: params.poId },
  });

  await pushAppNotification({
    outletId: params.outletId,
    kind: 'purchase_received',
    title: 'Goods received',
    body: `GRN ${grnId.slice(0, 8)} · ${params.items.length} line(s)`,
  });

  return { grnId };
}

export async function createPurchaseReturn(params: {
  outletId: string;
  poId?: string | null;
  supplierId?: string | null;
  reason: string;
  items: GrnItemInput[];
  userId?: string | null;
}): Promise<{ returnId: string }> {
  const { data: row, error } = await supabase
    .from('purchase_returns')
    .insert([
      {
        outlet_id: params.outletId,
        po_id: params.poId || null,
        supplier_id: params.supplierId || null,
        reason: params.reason,
        status: 'completed',
        created_by: params.userId || null,
      },
    ])
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  const returnId = row.id as string;

  await supabase.from('purchase_return_items').insert(
    params.items.map((i) => ({
      return_id: returnId,
      product_id: i.productId,
      quantity: i.quantity,
      unit_cost: i.unitCost ?? null,
    }))
  );

  for (const item of params.items) {
    await applyInventoryDelta({
      outletId: params.outletId,
      productId: item.productId,
      movementType: 'adjustment',
      quantityDelta: -Math.abs(item.quantity),
      referenceType: 'purchase_return',
      referenceId: returnId,
      notes: params.reason,
      createdBy: params.userId,
    });
  }

  await writeAuditLog({
    outletId: params.outletId,
    userId: params.userId,
    action: 'purchase_edit',
    entityType: 'purchase_return',
    entityId: returnId,
    reason: params.reason,
    newValue: { items: params.items },
  });

  return { returnId };
}
