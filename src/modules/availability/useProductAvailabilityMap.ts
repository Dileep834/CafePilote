import { useEffect, useMemo, useState } from 'react';
import { loadAvailabilityPolicy } from './policyService';
import { loadProductAvailabilityState } from './manualOverrideService';
import { loadChannelVisibilityMap } from './channelVisibilityService';
import { resolveProductAvailability } from './availabilityResolver';
import type { AvailabilityChannel, ResolvedAvailability } from './types';

export function useProductAvailabilityMap(
  outletId: string | null | undefined,
  products: Array<Record<string, unknown>>,
  channel: AvailabilityChannel
) {
  const [map, setMap] = useState<Map<string, ResolvedAvailability>>(new Map());
  const [ready, setReady] = useState(false);
  const productIds = useMemo(
    () => products.map((p) => String(p.id || '')).filter(Boolean),
    [products]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (productIds.length === 0) {
        if (!cancelled) {
          setMap(new Map());
          setReady(true);
        }
        return;
      }

      setReady(false);
      const policy = await loadAvailabilityPolicy(outletId);
      const state = await loadProductAvailabilityState(outletId, productIds);
      const channelMap = await loadChannelVisibilityMap(outletId, productIds, channel);

      const next = new Map<string, ResolvedAvailability>();
      for (const product of products) {
        const productId = String(product.id || '');
        if (!productId) continue;
        next.set(
          productId,
          resolveProductAvailability({
            product,
            policy,
            channel,
            channelMode: channelMap.get(productId),
            state: state.get(productId),
          })
        );
      }

      if (!cancelled) {
        setMap(next);
        setReady(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [channel, outletId, productIds.join('|'), products]);

  return { map, ready };
}
