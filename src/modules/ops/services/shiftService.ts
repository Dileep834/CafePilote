import { supabase } from '@/lib/supabase';
import { writeAuditLog } from './auditService';
import type { ShiftTxnType } from '../types';

export type ShiftHeader = {
  id: string;
  outlet_id: string;
  terminal_id: string;
  status: 'open' | 'closed';
  opening_cash: number;
  closing_cash_counted?: number | null;
  expected_cash?: number | null;
  variance?: number | null;
  total_sales?: number;
  total_refunds?: number;
  total_cash_in?: number;
  total_cash_out?: number;
  total_expenses?: number;
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;
};

const TERMINAL_KEY = 'cafepilots-terminal-id';

export function getTerminalId(): string {
  try {
    let id = localStorage.getItem(TERMINAL_KEY);
    if (!id) {
      id = `term-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(TERMINAL_KEY, id);
    }
    return id;
  } catch {
    return 'default';
  }
}

export async function getOpenShift(
  outletId: string | null | undefined,
  terminalId = getTerminalId()
): Promise<ShiftHeader | null> {
  if (!outletId) return null;
  try {
    const { data, error } = await supabase
      .from('shift_headers')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('terminal_id', terminalId)
      .eq('status', 'open')
      .maybeSingle();
    if (error) {
      console.warn('[shift] getOpen', error.message);
      return null;
    }
    return data as ShiftHeader | null;
  } catch {
    return null;
  }
}

export async function openShift(params: {
  outletId: string;
  openingCash: number;
  userId?: string | null;
  userName?: string | null;
  notes?: string;
  terminalId?: string;
}): Promise<ShiftHeader> {
  const terminalId = params.terminalId || getTerminalId();
  const existing = await getOpenShift(params.outletId, terminalId);
  if (existing) {
    throw new Error('A shift is already open on this terminal. Close it before opening a new one.');
  }

  const { data, error } = await supabase
    .from('shift_headers')
    .insert([
      {
        outlet_id: params.outletId,
        terminal_id: terminalId,
        opened_by: params.userId || null,
        status: 'open',
        opening_cash: params.openingCash,
        notes: params.notes || null,
      },
    ])
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Could not open shift. Run phase1_production_schema.sql');

  await writeAuditLog({
    outletId: params.outletId,
    userId: params.userId,
    userName: params.userName,
    action: 'shift_open',
    entityType: 'shift',
    entityId: data.id,
    newValue: { openingCash: params.openingCash, terminalId },
  });

  return data as ShiftHeader;
}

export async function recordShiftTransaction(params: {
  shiftId: string;
  txnType: ShiftTxnType;
  amount: number;
  paymentMethod?: string;
  referenceId?: string | null;
  notes?: string;
  createdBy?: string | null;
}): Promise<void> {
  try {
    await supabase.from('shift_transactions').insert([
      {
        shift_id: params.shiftId,
        txn_type: params.txnType,
        amount: params.amount,
        payment_method: params.paymentMethod || null,
        reference_id: params.referenceId || null,
        notes: params.notes || null,
        created_by: params.createdBy || null,
      },
    ]);

    // Maintain running totals on header
    const field =
      params.txnType === 'sale'
        ? 'total_sales'
        : params.txnType === 'refund'
          ? 'total_refunds'
          : params.txnType === 'cash_in' || params.txnType === 'petty_cash'
            ? 'total_cash_in'
            : params.txnType === 'cash_out' || params.txnType === 'expense'
              ? 'total_cash_out'
              : null;

    if (field) {
      const { data: shift } = await supabase
        .from('shift_headers')
        .select(field)
        .eq('id', params.shiftId)
        .single();
      if (shift) {
        const current = Number((shift as Record<string, number>)[field] || 0);
        await supabase
          .from('shift_headers')
          .update({ [field]: current + params.amount })
          .eq('id', params.shiftId);
      }
    }
  } catch (err) {
    console.warn('[shift] txn skipped', err);
  }
}

export function computeExpectedCash(shift: ShiftHeader): number {
  const opening = Number(shift.opening_cash || 0);
  // Expected cash ≈ opening + cash sales - cash refunds + cash_in - cash_out - expenses
  // Detailed method mix comes from shift_transactions; this is a header approximation.
  return (
    opening +
    Number(shift.total_cash_in || 0) -
    Number(shift.total_cash_out || 0) -
    Number(shift.total_expenses || 0)
  );
}

export async function closeShift(params: {
  shiftId: string;
  countedCash: number;
  userId?: string | null;
  userName?: string | null;
  notes?: string;
}): Promise<ShiftHeader> {
  const { data: shift, error: readErr } = await supabase
    .from('shift_headers')
    .select('*')
    .eq('id', params.shiftId)
    .single();

  if (readErr || !shift) throw new Error('Shift not found');
  if (shift.status !== 'open') throw new Error('Shift is already closed');

  // Compute expected from cash-method transactions when available
  let expected = Number(shift.opening_cash || 0);
  try {
    const { data: txns } = await supabase
      .from('shift_transactions')
      .select('txn_type, amount, payment_method')
      .eq('shift_id', params.shiftId);

    for (const t of txns || []) {
      const amt = Number(t.amount || 0);
      if (t.txn_type === 'sale' && t.payment_method === 'cash') expected += amt;
      if (t.txn_type === 'refund' && t.payment_method === 'cash') expected -= amt;
      if (t.txn_type === 'cash_in' || t.txn_type === 'petty_cash') expected += amt;
      if (t.txn_type === 'cash_out' || t.txn_type === 'expense') expected -= amt;
    }
  } catch {
    expected = computeExpectedCash(shift as ShiftHeader);
  }

  const variance = Math.round((params.countedCash - expected) * 100) / 100;

  const { data, error } = await supabase
    .from('shift_headers')
    .update({
      status: 'closed',
      closed_by: params.userId || null,
      closing_cash_counted: params.countedCash,
      expected_cash: expected,
      variance,
      notes: params.notes || shift.notes,
      closed_at: new Date().toISOString(),
    })
    .eq('id', params.shiftId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    outletId: shift.outlet_id,
    userId: params.userId,
    userName: params.userName,
    action: 'shift_close',
    entityType: 'shift',
    entityId: params.shiftId,
    oldValue: { status: 'open' },
    newValue: { countedCash: params.countedCash, expected, variance },
  });

  return data as ShiftHeader;
}

export async function listShifts(outletId: string, limit = 30) {
  const { data, error } = await supabase
    .from('shift_headers')
    .select('*')
    .eq('outlet_id', outletId)
    .order('opened_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ShiftHeader[];
}

export async function getShiftTransactions(shiftId: string) {
  const { data, error } = await supabase
    .from('shift_transactions')
    .select('*')
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Best-effort: attach sale to open shift without blocking checkout */
export async function attachSaleToOpenShift(params: {
  outletId?: string | null;
  orderId: string;
  amount: number;
  paymentMethod: string;
  userId?: string | null;
}): Promise<string | null> {
  if (!params.outletId) return null;
  const shift = await getOpenShift(params.outletId);
  if (!shift) return null;
  await recordShiftTransaction({
    shiftId: shift.id,
    txnType: 'sale',
    amount: params.amount,
    paymentMethod: params.paymentMethod,
    referenceId: params.orderId,
    createdBy: params.userId,
  });
  return shift.id;
}
