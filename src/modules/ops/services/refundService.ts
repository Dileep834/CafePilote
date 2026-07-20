import { supabase } from '@/lib/supabase';
import { canRefundAmount } from '../lib/validators';
import type { RefundReasonCode, RefundType, SaleLineInput } from '../types';
import { writeAuditLog } from './auditService';
import { restoreInventoryForRefund } from './recipeDeductionService';
import { getOpenShift, recordShiftTransaction } from './shiftService';

export type RefundItemInput = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type ProcessRefundInput = {
  outletId: string;
  orderId: string;
  refundType: RefundType;
  amount: number;
  reasonCode: RefundReasonCode;
  reasonNotes?: string;
  method: string;
  items?: RefundItemInput[];
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  managerApprovalId?: string | null;
};

export async function processRefund(input: ProcessRefundInput): Promise<{ refundId: string }> {
  const { data: order, error: orderErr } = await supabase
    .from('pos_orders')
    .select('id, total_amount, status, refunded_amount, payment_method, outlet_id')
    .eq('id', input.orderId)
    .single();

  if (orderErr || !order) throw new Error('Order not found');
  if (order.status === 'held' || order.status === 'open') {
    throw new Error('Cannot refund an unpaid / open check. Discard it instead.');
  }

  const already = Number(order.refunded_amount || 0);
  const total = Number(order.total_amount || 0);
  const check = canRefundAmount(total, already, input.amount);
  if (!check.ok) throw new Error(check.message);

  // Prevent double full refund race
  if (input.refundType === 'full' && already > 0.01) {
    throw new Error('Order already has refunds. Use partial/item refund for remaining balance.');
  }

  const { data: refund, error: refundErr } = await supabase
    .from('refund_transactions')
    .insert([
      {
        outlet_id: input.outletId,
        order_id: input.orderId,
        refund_type: input.refundType,
        amount: input.amount,
        reason_code: input.reasonCode,
        reason_notes: input.reasonNotes || null,
        method: input.method,
        items_payload: input.items || null,
        inventory_restored: false,
        approved_by: null,
        created_by: input.userId || null,
      },
    ])
    .select('id')
    .single();

  if (refundErr) {
    throw new Error(
      refundErr.message.includes('relation')
        ? 'Refund tables missing. Run scripts/phase1_production_schema.sql'
        : refundErr.message
    );
  }

  const refundId = refund.id as string;
  const newRefunded = already + input.amount;
  const newStatus = newRefunded + 0.01 >= total ? 'refunded' : order.status;

  await supabase
    .from('pos_orders')
    .update({
      refunded_amount: newRefunded,
      status: newStatus,
    })
    .eq('id', input.orderId);

  // Inventory restore
  let lines: SaleLineInput[] = [];
  if (input.items?.length) {
    lines = input.items.map((i) => ({
      productId: i.productId,
      name: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));
  } else if (input.refundType === 'full') {
    const { data: items } = await supabase
      .from('pos_order_items')
      .select('product_id, product_name, quantity, unit_price')
      .eq('order_id', input.orderId);
    lines = (items || []).map((i) => ({
      productId: i.product_id,
      name: i.product_name,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
    }));
  }

  if (lines.length) {
    try {
      await restoreInventoryForRefund({
        outletId: input.outletId,
        orderId: input.orderId,
        refundId,
        lines,
        createdBy: input.userId,
      });
      await supabase
        .from('refund_transactions')
        .update({ inventory_restored: true })
        .eq('id', refundId);
    } catch (err) {
      console.warn('[refund] inventory restore failed', err);
    }
  }

  const shift = await getOpenShift(input.outletId);
  if (shift) {
    await recordShiftTransaction({
      shiftId: shift.id,
      txnType: 'refund',
      amount: input.amount,
      paymentMethod: input.method,
      referenceId: refundId,
      createdBy: input.userId,
      notes: input.reasonCode,
    });
  }

  await writeAuditLog({
    outletId: input.outletId,
    userId: input.userId,
    userName: input.userName,
    userRole: input.userRole,
    action: 'refund',
    entityType: 'pos_order',
    entityId: input.orderId,
    oldValue: { refunded_amount: already, status: order.status },
    newValue: { refunded_amount: newRefunded, status: newStatus, amount: input.amount },
    reason: `${input.reasonCode}${input.reasonNotes ? `: ${input.reasonNotes}` : ''}`,
    managerApprovalId: input.managerApprovalId,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cafepilots:orders-updated', {
        detail: { orderId: input.orderId, refundId },
      })
    );
  }

  return { refundId };
}

export async function listRefunds(outletId: string, limit = 50) {
  const { data, error } = await supabase
    .from('refund_transactions')
    .select('*')
    .eq('outlet_id', outletId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
