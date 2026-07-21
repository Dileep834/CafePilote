import { supabase } from '@/lib/supabase';
import type { AvailabilityChannel, ChannelVisibilityMode } from './types';

export async function loadChannelVisibilityMap(
  outletId: string | null | undefined,
  productIds: string[],
  channel: AvailabilityChannel
): Promise<Map<string, ChannelVisibilityMode>> {
  const map = new Map<string, ChannelVisibilityMode>();
  if (!outletId || productIds.length === 0) return map;

  try {
    const { data } = await supabase
      .from('product_channel_visibility')
      .select('product_id, visibility_mode')
      .eq('outlet_id', outletId)
      .eq('channel', channel)
      .in('product_id', productIds);

    for (const row of data || []) {
      const productId = String((row as { product_id?: string }).product_id || '');
      const mode = String((row as { visibility_mode?: string }).visibility_mode || 'inherit') as ChannelVisibilityMode;
      if (productId) map.set(productId, mode);
    }
  } catch {
    return map;
  }

  return map;
}

export function applyChannelVisibility(
  status: string,
  channelMode: ChannelVisibilityMode | undefined
): { canShow: boolean; canSell: boolean } {
  if (channelMode === 'hide') return { canShow: false, canSell: false };
  if (channelMode === 'show') return { canShow: true, canSell: true };
  if (channelMode === 'oos_badge') return { canShow: true, canSell: status === 'available' || status === 'low_stock' };
  if (channelMode === 'unavailable_api') return { canShow: true, canSell: false };
  return { canShow: true, canSell: true };
}
