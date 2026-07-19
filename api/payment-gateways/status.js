import { getPaymentStatus, readJsonBody, sendJson } from '../../server/paymentGateways.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use GET or POST.' });
  }

  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const payload = { ...(req.query || {}), ...body };
    const status = await getPaymentStatus(payload);
    return sendJson(res, 200, { ok: true, status });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      code: error.code || 'PAYMENT_STATUS_ERROR',
      message: error.message || 'Payment status check failed.',
      ...(error.details || {}),
    });
  }
}
