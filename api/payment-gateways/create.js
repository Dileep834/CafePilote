import { createPaymentSession, readJsonBody, sendJson } from '../../server/paymentGateways.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
  }

  try {
    const payload = await readJsonBody(req);
    const session = await createPaymentSession(req, payload);
    return sendJson(res, 200, { ok: true, session });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      code: error.code || 'PAYMENT_GATEWAY_ERROR',
      message: error.message || 'Payment gateway failed.',
      ...(error.details || {}),
    });
  }
}
