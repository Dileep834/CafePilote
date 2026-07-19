import {
  listOutletGatewaySettings,
  readJsonBody,
  saveOutletGatewaySettings,
  sendJson,
} from '../../server/paymentGateways.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use GET or POST.' });
  }

  try {
    if (req.method === 'GET') {
      const payload = await listOutletGatewaySettings(req.query?.outletId);
      return sendJson(res, 200, { ok: true, ...payload });
    }

    const body = await readJsonBody(req);
    const payload = await saveOutletGatewaySettings(req, body);
    return sendJson(res, 200, { ok: true, ...payload });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      code: error.code || 'PAYMENT_GATEWAY_SETTINGS_ERROR',
      message: error.message || 'Payment gateway settings failed.',
      ...(error.details || {}),
    });
  }
}
