import type { AvailabilityChannel, ProductAvailabilityStatus } from './types';

export type AvailabilitySyncPayload = {
  outletId: string;
  productId: string;
  status: ProductAvailabilityStatus;
  channels: AvailabilityChannel[];
};

export async function syncProductAvailability(payload: AvailabilitySyncPayload): Promise<void> {
  // Phase 3 stub: concrete marketplace connectors can plug in here.
  console.info('[availability-sync] queued', payload);
}
