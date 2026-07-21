import { useEffect, useMemo, useRef, useState } from 'react';
import { loadAvailabilityPolicy } from './policyService';
import { loadProductAvailabilityState } from './manualOverrideService';
import { loadChannelVisibilityMap } from './channelVisibilityService';
import { resolveProductAvailability } from './availabilityResolver';
import type { AvailabilityChannel, ResolvedAvailability } from './types';

function availableFallback(productId: string): ResolvedAvailability {
  return {
    productId,
    status: 'available',
    source: 'product',
    canShow: true,
    canSell: true,
    badge: 'Available',
    reason: 'Availability check deferred',
    availableServings: null,
  };
}

/**
 * POS availability map — stale-while-revalidate.
 * Never blanks the grid to "Blocked" while reloading after a sale.
 */
export function useProductAvailabilityMap(
  outletId: string | null | undefined,
  products: Array<Record<string, unknown>>,
  channel: AvailabilityChannel
) {
  const [map, setMap] = useState<Map<string, ResolvedAvailability>>(new Map());
  const [ready, setReady] = useState(false);
  const productsRef = useRef(products);
  productsRef.current = products;

  const productIdsKey = useMemo(
    () =>
      products
        .map((p) => String(p.id || ''))
        .filter(Boolean)
        .sort()
        .join('|'),
    [products]
  );

  useEffect(() => {
    let cancelled = false;
    const productIds = productIdsKey ? productIdsKey.split('|') : [];

    const run = async () => {
      if (productIds.length === 0) {
        if (!cancelled) {
          setMap(new Map());
          setReady(true);
        }
        return;
      }

      // Keep previous map sellable while refreshing (do NOT setReady(false))
      try {
        const [policy, state, channelMap] = await Promise.all([
          loadAvailabilityPolicy(outletId),
          loadProductAvailabilityState(outletId, productIds),
          loadChannelVisibilityMap(outletId, productIds, channel),
        ]);

        if (cancelled) return;

        const list = productsRef.current;
        const next = new Map<string, ResolvedAvailability>();
        for (const product of list) {
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

        setMap(next);
        setReady(true);
      } catch (err) {
        console.warn('[availability] map load failed — keeping POS sellable', err);
        if (cancelled) return;
        // Fail open: never lock the entire menu after a checkout glitch
        const next = new Map<string, ResolvedAvailability>();
        for (const id of productIds) next.set(id, availableFallback(id));
        setMap(next);
        setReady(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [channel, outletId, productIdsKey]);

  return { map, ready };
}
