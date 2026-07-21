import { ConnectivityService } from './ConnectivityService';
import {
  paymentMethodAvailableOffline,
  resolveOfflinePaymentPolicy,
} from '../lib/capabilities';
import type { OfflinePaymentPolicy } from '../types/entities';
import { DEFAULT_OFFLINE_PAYMENT_POLICY } from '../types/entities';

export type PaymentAvailability = {
  method: string;
  available: boolean;
  warning?: string;
};

/**
 * PaymentService — offline-aware payment policy.
 * Cash always allowed offline; UPI disabled unless gateway supports offline; card configurable.
 */
export const PaymentService = {
  getPolicy(overrides?: Partial<OfflinePaymentPolicy>): OfflinePaymentPolicy {
    return resolveOfflinePaymentPolicy(ConnectivityService.isOnline(), {
      ...DEFAULT_OFFLINE_PAYMENT_POLICY,
      ...overrides,
    });
  },

  checkMethod(method: string, overrides?: Partial<OfflinePaymentPolicy>): PaymentAvailability {
    const policy = this.getPolicy(overrides);
    const result = paymentMethodAvailableOffline(method, policy);
    return { method, available: result.ok, warning: result.warning };
  },

  assertAllowed(method: string, overrides?: Partial<OfflinePaymentPolicy>): void {
    const check = this.checkMethod(method, overrides);
    if (!check.available) {
      throw new Error(check.warning || `Payment method ${method} unavailable`);
    }
  },

  listMethods(overrides?: Partial<OfflinePaymentPolicy>): PaymentAvailability[] {
    return ['cash', 'card', 'upi', 'split'].map((m) => this.checkMethod(m, overrides));
  },
};
