import { supabase } from '@/lib/supabase';

/** Simple earn: 1 point per ₹100 spent (floor). */
export function pointsForSpend(amount: number): number {
  return Math.floor(Math.max(0, amount) / 100);
}

export async function earnLoyaltyPoints(params: {
  outletId?: string | null;
  customerId?: string | null;
  customerPhone?: string | null;
  orderId: string;
  spendAmount: number;
  userId?: string | null;
}): Promise<number> {
  const points = pointsForSpend(params.spendAmount);
  if (points <= 0) return 0;

  let customerId = params.customerId;
  let balance = 0;

  if (!customerId && params.customerPhone) {
    const phone = params.customerPhone.replace(/\D/g, '');
    const { data } = await supabase
      .from('customers')
      .select('id, loyalty_points')
      .eq('phone', params.customerPhone)
      .maybeSingle();
    if (data) {
      customerId = data.id;
      balance = Number(data.loyalty_points || 0);
    } else if (phone.length >= 10) {
      // try digits-only match skipped — keep phone as-is
    }
  } else if (customerId) {
    const { data } = await supabase
      .from('customers')
      .select('loyalty_points')
      .eq('id', customerId)
      .maybeSingle();
    balance = Number(data?.loyalty_points || 0);
  }

  if (!customerId) return 0;

  const next = balance + points;
  await supabase.from('customers').update({ loyalty_points: next }).eq('id', customerId);

  try {
    await supabase.from('loyalty_transactions').insert([
      {
        outlet_id: params.outletId || null,
        customer_id: customerId,
        customer_phone: params.customerPhone || null,
        points_delta: points,
        balance_after: next,
        reason: 'earn_purchase',
        reference_type: 'pos_order',
        reference_id: params.orderId,
        created_by: params.userId || null,
      },
    ]);
  } catch {
    /* optional table */
  }

  return points;
}
