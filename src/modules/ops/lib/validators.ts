import type { PaymentValidationResult, SplitTenderLine } from '../types';

/** Pure validators — no I/O (unit-testable). */

export function validateCashTender(total: number, tendered: number): PaymentValidationResult {
  if (total < 0) return { ok: false, code: 'NEGATIVE_TOTAL', message: 'Bill total cannot be negative.' };
  if (tendered < 0) return { ok: false, code: 'NEGATIVE_TENDER', message: 'Tendered amount cannot be negative.' };
  if (tendered + 1e-6 < total) {
    return { ok: false, code: 'INSUFFICIENT_CASH', message: 'Cash tendered is less than bill total.' };
  }
  return { ok: true };
}

export function validateSplitPayment(total: number, lines: SplitTenderLine[]): PaymentValidationResult {
  if (!lines.length) return { ok: false, code: 'EMPTY_SPLIT', message: 'Add at least one split payment line.' };
  for (const line of lines) {
    if (!line.method) return { ok: false, code: 'SPLIT_METHOD', message: 'Each split line needs a method.' };
    if (!(line.amount > 0)) return { ok: false, code: 'SPLIT_AMOUNT', message: 'Split amounts must be positive.' };
  }
  const sum = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
  if (sum + 0.01 < total) {
    return {
      ok: false,
      code: 'SPLIT_UNDER',
      message: `Split total (₹${sum.toFixed(2)}) is less than bill (₹${total.toFixed(2)}).`,
    };
  }
  return { ok: true };
}

export function computeChange(total: number, tendered: number): number {
  return Math.max(0, Math.round((tendered - total) * 100) / 100);
}

export function needsManagerPinForDiscount(
  discountPct: number,
  thresholdPct: number
): boolean {
  return discountPct > thresholdPct;
}

export function canRefundAmount(
  orderTotal: number,
  alreadyRefunded: number,
  requested: number
): PaymentValidationResult {
  if (requested <= 0) return { ok: false, code: 'REFUND_ZERO', message: 'Refund amount must be positive.' };
  const remaining = Math.max(0, orderTotal - alreadyRefunded);
  if (requested - remaining > 0.01) {
    return {
      ok: false,
      code: 'REFUND_OVER',
      message: `Refund exceeds remaining refundable amount (₹${remaining.toFixed(2)}).`,
    };
  }
  return { ok: true };
}

export function createIdempotencyKey(parts: Array<string | number | null | undefined>): string {
  return parts
    .filter((p) => p !== null && p !== undefined && String(p).length > 0)
    .join(':');
}

/** Deterministic UUID-ish from string (browser-safe). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
