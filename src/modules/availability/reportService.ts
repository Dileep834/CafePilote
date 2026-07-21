import { supabase } from '@/lib/supabase';

export type AvailabilityReportRow = {
  productId: string;
  productName: string;
  status: string;
  updatedAt: string | null;
  availableServings: number | null;
};

export async function fetchAvailabilityReport(outletId?: string | null): Promise<AvailabilityReportRow[]> {
  if (!outletId) return [];

  try {
    const { data } = await supabase
      .from('product_outlet_availability')
      .select('product_id, effective_status, updated_at, available_servings, products(name)')
      .eq('outlet_id', outletId)
      .order('updated_at', { ascending: false });

    return (data || []).map((row) => ({
      productId: String((row as { product_id?: string }).product_id || ''),
      productName: String((row as { products?: { name?: string } }).products?.name || 'Product'),
      status: String((row as { effective_status?: string }).effective_status || 'available'),
      updatedAt: ((row as { updated_at?: string | null }).updated_at || null),
      availableServings:
        (row as { available_servings?: number | null }).available_servings === null
          ? null
          : Number((row as { available_servings?: number | null }).available_servings),
    }));
  } catch {
    return [];
  }
}

export async function fetchAvailabilityHistory(outletId?: string | null) {
  if (!outletId) return [];

  try {
    const { data } = await supabase
      .from('product_availability_log')
      .select('*, products(name)')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false })
      .limit(200);
    return data || [];
  } catch {
    return [];
  }
}
