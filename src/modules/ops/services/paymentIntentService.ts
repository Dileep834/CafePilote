import { supabase } from '@/lib/supabase';
import type { PaymentIntentStatus, SplitTenderLine } from '../types';
import { createIdempotencyKey } from '../lib/validators';

export type CreatePaymentIntentInput = {
  idempotencyKey: string;
  outletId?: string | null;
  amount: number;
  paymentMethod: string;
  splitLines?: SplitTenderLine[];
  gatewayPayload?: Record<string, unknown>;
  createdBy?: string | null;
};

export type PaymentIntentRow = {
  id: string;
  idempotency_key: string;
  status: PaymentIntentStatus;
  order_id?: string | null;
  amount: number;
};

/**
 * Create or return existing payment intent by idempotency key.
 * Prevents duplicate checkout / double-click payments.
 */
export async function createOrGetPaymentIntent(
  input: CreatePaymentIntentInput
): Promise<{ intent: PaymentIntentRow | null; reused: boolean; localOnly: boolean }> {
  const key = input.idempotencyKey || createIdempotencyKey([Date.now()]);

  try {
    const { data: existing } = await supabase
      .from('payment_intents')
      .select('id, idempotency_key, status, order_id, amount')
      .eq('idempotency_key', key)
      .maybeSingle();

    if (existing) {
      return {
        intent: existing as PaymentIntentRow,
        reused: true,
        localOnly: false,
      };
    }

    const { data, error } = await supabase
      .from('payment_intents')
      .insert([
        {
          idempotency_key: key,
          outlet_id: input.outletId || null,
          amount: input.amount,
          payment_method: input.paymentMethod,
          status: 'processing',
          split_payload: input.splitLines || null,
          gateway_payload: input.gatewayPayload || null,
          created_by: input.createdBy || null,
        },
      ])
      .select('id, idempotency_key, status, order_id, amount')
      .single();

    if (error) {
      // Unique race — fetch again
      if (error.code === '23505') {
        const { data: again } = await supabase
          .from('payment_intents')
          .select('id, idempotency_key, status, order_id, amount')
          .eq('idempotency_key', key)
          .maybeSingle();
        if (again) return { intent: again as PaymentIntentRow, reused: true, localOnly: false };
      }
      console.warn('[paymentIntent] table unavailable, continuing local-only', error.message);
      return {
        intent: {
          id: `local-${key}`,
          idempotency_key: key,
          status: 'processing',
          amount: input.amount,
        },
        reused: false,
        localOnly: true,
      };
    }

    return { intent: data as PaymentIntentRow, reused: false, localOnly: false };
  } catch (err) {
    console.warn('[paymentIntent] failed', err);
    return {
      intent: {
        id: `local-${key}`,
        idempotency_key: key,
        status: 'processing',
        amount: input.amount,
      },
      reused: false,
      localOnly: true,
    };
  }
}

export async function completePaymentIntent(params: {
  intentId: string;
  orderId: string;
  status?: PaymentIntentStatus;
  tenderLines?: Array<{
    method: string;
    amount: number;
    tendered?: number;
    changeDue?: number;
    providerRef?: string;
  }>;
  outletId?: string | null;
}): Promise<void> {
  if (params.intentId.startsWith('local-')) return;

  try {
    await supabase
      .from('payment_intents')
      .update({
        status: params.status || 'succeeded',
        order_id: params.orderId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.intentId);

    if (params.tenderLines?.length) {
      await supabase.from('payment_transactions').insert(
        params.tenderLines.map((line) => ({
          payment_intent_id: params.intentId,
          order_id: params.orderId,
          outlet_id: params.outletId || null,
          method: line.method,
          amount: line.amount,
          tendered_amount: line.tendered ?? line.amount,
          change_due: line.changeDue ?? 0,
          provider_ref: line.providerRef || null,
          status: 'captured',
        }))
      );
    }
  } catch (err) {
    console.warn('[paymentIntent] complete skipped', err);
  }
}

export async function failPaymentIntent(intentId: string, message: string): Promise<void> {
  if (intentId.startsWith('local-')) return;
  try {
    await supabase
      .from('payment_intents')
      .update({ status: 'failed', error_message: message })
      .eq('id', intentId);
  } catch {
    /* ignore */
  }
}

/** In-memory lock to prevent double-submit in same tab */
const locks = new Set<string>();

export function acquireCheckoutLock(key: string): boolean {
  if (locks.has(key)) return false;
  locks.add(key);
  return true;
}

export function releaseCheckoutLock(key: string): void {
  locks.delete(key);
}
