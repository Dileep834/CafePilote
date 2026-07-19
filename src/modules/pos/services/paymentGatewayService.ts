import type { OnlinePaymentMethod } from '../store/usePOSStore';

export interface CreateGatewayPaymentInput {
  gateway: OnlinePaymentMethod;
  outletId: string;
  amount: number;
  currency?: 'INR';
  customer?: {
    name?: string;
    phone?: string;
  };
  order?: {
    tableLabel?: string | null;
    itemCount?: number;
  };
}

export interface GatewayPaymentSession {
  gateway: OnlinePaymentMethod;
  outletId?: string;
  status: 'created';
  providerOrderId: string;
  providerSessionId?: string;
  providerTransactionId?: string;
  amount: string;
  currency: 'INR';
  nextAction: 'redirect' | 'paytm_checkout' | 'provider_console';
  redirectUrl?: string;
  checkout?: {
    mid: string;
    orderId: string;
    amount: string;
    txnToken: string;
    scriptUrl: string;
  };
  providerStatus?: unknown;
}

export interface GatewayPaymentStatus {
  gateway: OnlinePaymentMethod;
  status: 'success' | 'pending' | 'failed' | 'unknown';
  rawStatus?: string;
  providerOrderId?: string;
  providerSessionId?: string;
  providerTransactionId?: string;
  providerResponse?: unknown;
}

export interface PaymentGatewayFieldDefinition {
  name: string;
  label: string;
  required?: boolean;
  secret?: boolean;
  multiline?: boolean;
  placeholder?: string;
}

export interface OutletGatewaySetting {
  gateway: OnlinePaymentMethod;
  label: string;
  isEnabled: boolean;
  configured: boolean;
  mode: 'sandbox' | 'production';
  config: Record<string, string>;
  savedSecrets: Record<string, boolean>;
}

export interface OutletGatewaySettingsResponse {
  outletId: string;
  gateways: OutletGatewaySetting[];
  fields: Record<OnlinePaymentMethod, PaymentGatewayFieldDefinition[]>;
}

declare global {
  interface Window {
    Paytm?: {
      CheckoutJS?: {
        onLoad: (callback: () => void) => void;
        init: (config: unknown) => Promise<unknown>;
        invoke: () => void;
      };
    };
  }
}

export function isOnlinePaymentMethod(method: string): method is OnlinePaymentMethod {
  return method === 'paytm' || method === 'phonepe' || method === 'amazonpay';
}

export async function createGatewayPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentSession> {
  const response = await fetch('/api/payment-gateways/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Payment gateway is unavailable.');
  }

  return data.session;
}

export async function checkGatewayPaymentStatus(session: GatewayPaymentSession): Promise<GatewayPaymentStatus> {
  const response = await fetch('/api/payment-gateways/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gateway: session.gateway,
      outletId: session.outletId,
      orderId: session.providerOrderId,
      providerSessionId: session.providerSessionId,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Could not verify payment status.');
  }

  return data.status;
}

export async function fetchOutletGatewaySettings(outletId: string): Promise<OutletGatewaySettingsResponse> {
  const response = await fetch(`/api/payment-gateways/settings?outletId=${encodeURIComponent(outletId)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Could not load payment gateway settings.');
  }

  return {
    outletId: data.outletId,
    gateways: data.gateways || [],
    fields: data.fields || {},
  };
}

export async function saveOutletGatewaySettings(
  input: {
    outletId: string;
    companyId?: string | null;
    gateways: Array<{
      gateway: OnlinePaymentMethod;
      isEnabled: boolean;
      mode: 'sandbox' | 'production';
      config: Record<string, string>;
    }>;
  },
  token: string | null | undefined
): Promise<OutletGatewaySettingsResponse> {
  const response = await fetch('/api/payment-gateways/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Could not save payment gateway settings.');
  }

  return {
    outletId: data.outletId,
    gateways: data.gateways || [],
    fields: data.fields || {},
  };
}

export async function invokePaytmCheckout(
  session: GatewayPaymentSession,
  onGatewayEvent?: (eventName: string, data: unknown) => void
): Promise<void> {
  if (session.gateway !== 'paytm' || !session.checkout) {
    throw new Error('Paytm checkout details are missing.');
  }

  await loadScript('cafepilots-paytm-checkout', session.checkout.scriptUrl);

  await new Promise<void>((resolve, reject) => {
    const checkout = window.Paytm?.CheckoutJS;
    if (!checkout) {
      reject(new Error('Paytm checkout did not load.'));
      return;
    }

    checkout.onLoad(() => {
      checkout
        .init({
          root: '',
          flow: 'DEFAULT',
          data: {
            orderId: session.checkout?.orderId,
            token: session.checkout?.txnToken,
            tokenType: 'TXN_TOKEN',
            amount: session.checkout?.amount,
          },
          handler: {
            notifyMerchant: (eventName: string, data: unknown) => {
              onGatewayEvent?.(eventName, data);
            },
            transactionStatus: (data: unknown) => {
              onGatewayEvent?.('transactionStatus', data);
            },
          },
        })
        .then(() => {
          checkout.invoke();
          resolve();
        })
        .catch((error: Error) => reject(error));
    });
  });
}

function loadScript(id: string, src: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  if (existing) existing.remove();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Unable to load payment checkout script.'));
    document.head.appendChild(script);
  });
}
