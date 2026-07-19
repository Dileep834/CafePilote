import { parseGatewayCallback, readJsonBody, sendRedirect } from '../../server/paymentGateways.js';

export default async function handler(req, res) {
  const body = req.method === 'POST' ? await readJsonBody(req) : {};
  const callback = parseGatewayCallback(req, body);
  const params = new URLSearchParams({
    payment_gateway: callback.gateway,
    providerOrderId: callback.orderId,
    gateway_status: callback.providerStatus,
  });

  return sendRedirect(res, `/erp/pos/checkout?${params.toString()}`);
}
