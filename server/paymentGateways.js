import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const PaytmChecksum = require('paytmchecksum');

const SUPPORTED_GATEWAYS = new Set(['paytm', 'phonepe', 'amazonpay']);
const ADMIN_ROLES = new Set(['Super Admin', 'Admin', 'Outlet Owner', 'Outlet Manager']);
const AMAZON_API_VERSION = 'v2';
const AMAZON_SIGNATURE_ALGORITHM = 'AMZN-PAY-RSASSA-PSS-V2';
const AMAZON_REGION_MAP = {
  na: 'na',
  us: 'na',
  de: 'eu',
  uk: 'eu',
  eu: 'eu',
  jp: 'jp',
};
const AMAZON_API_ENDPOINTS = {
  na: 'pay-api.amazon.com',
  eu: 'pay-api.amazon.eu',
  jp: 'pay-api.amazon.jp',
};
const GATEWAY_LABELS = {
  paytm: 'Paytm',
  phonepe: 'PhonePe',
  amazonpay: 'Amazon Pay',
};
const GATEWAY_FIELD_DEFINITIONS = {
  paytm: [
    { name: 'PAYTM_MID', label: 'Merchant ID', required: true },
    { name: 'PAYTM_MERCHANT_KEY', label: 'Merchant Key', required: true, secret: true },
    { name: 'PAYTM_WEBSITE', label: 'Website name', required: false, placeholder: 'WEBSTAGING or DEFAULT' },
    { name: 'PAYTM_CALLBACK_URL', label: 'Callback URL', required: false },
  ],
  phonepe: [
    { name: 'PHONEPE_CLIENT_ID', label: 'Client ID', required: true },
    { name: 'PHONEPE_CLIENT_VERSION', label: 'Client Version', required: true },
    { name: 'PHONEPE_CLIENT_SECRET', label: 'Client Secret', required: true, secret: true },
    { name: 'PHONEPE_REDIRECT_URL', label: 'Redirect URL', required: false },
  ],
  amazonpay: [
    { name: 'AMAZON_PAY_PUBLIC_KEY_ID', label: 'Public Key ID', required: true },
    { name: 'AMAZON_PAY_STORE_ID', label: 'Store ID', required: true },
    { name: 'AMAZON_PAY_PRIVATE_KEY', label: 'Private Key PEM', required: true, secret: true, multiline: true },
    { name: 'AMAZON_PAY_REGION', label: 'Region', required: false, placeholder: 'eu, us, or jp' },
    { name: 'AMAZON_PAY_STORE_NAME', label: 'Store name', required: false },
    { name: 'AMAZON_PAY_RETURN_URL', label: 'Return URL', required: false },
  ],
};

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function sendRedirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

export function makePublicBaseUrl(req) {
  const configuredBase = cleanEnv('PAYMENT_PUBLIC_BASE_URL') || cleanEnv('PUBLIC_SITE_URL');
  if (configuredBase) return configuredBase.replace(/\/+$/, '');

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${host}`.replace(/\/+$/, '');
}

export async function createPaymentSession(req, payload) {
  const gateway = normalizeGateway(payload.gateway);
  const outletId = normalizeOutletId(payload.outletId);
  const config = await resolveGatewayConfig(gateway, outletId, { requireEnabled: true });
  const amount = normalizeAmount(payload.amount);
  const orderId = normalizeOrderId(payload.orderId || createProviderOrderId(gateway));
  const currency = String(payload.currency || 'INR').toUpperCase();
  const baseUrl = makePublicBaseUrl(req);

  if (currency !== 'INR') {
    throw httpError(400, 'Payments are currently configured for INR only.', 'UNSUPPORTED_CURRENCY');
  }

  if (gateway === 'paytm') {
    return createPaytmPayment({ amount, orderId, baseUrl, payload, config, outletId });
  }

  if (gateway === 'phonepe') {
    return createPhonePePayment({ amount, orderId, baseUrl, config, outletId });
  }

  return createAmazonPayPayment({ amount, orderId, baseUrl, config, outletId });
}

export async function getPaymentStatus(payload) {
  const gateway = normalizeGateway(payload.gateway);
  const outletId = normalizeOutletId(payload.outletId);
  const config = await resolveGatewayConfig(gateway, outletId, { requireEnabled: true });
  const orderId = normalizeOrderId(payload.orderId || payload.providerOrderId || payload.merchantOrderId);

  if (gateway === 'paytm') {
    return getPaytmPaymentStatus(orderId, config);
  }

  if (gateway === 'phonepe') {
    return getPhonePePaymentStatus(orderId, config);
  }

  return getAmazonPaymentStatus(payload.providerSessionId || payload.checkoutSessionId || orderId, config);
}

export async function listOutletGatewaySettings(outletId) {
  const normalizedOutletId = normalizeOutletId(outletId);
  const rows = await loadGatewayRows(normalizedOutletId);

  return {
    outletId: normalizedOutletId,
    gateways: Object.keys(GATEWAY_FIELD_DEFINITIONS).map((gateway) => {
      const row = rows.find((entry) => entry.gateway === gateway);
      const config = {
        ...envGatewayConfig(gateway),
        ...((row?.config_json || row?.config || {}) ?? {}),
      };

      return publicGatewaySetting(gateway, row, config);
    }),
    fields: GATEWAY_FIELD_DEFINITIONS,
  };
}

export async function saveOutletGatewaySettings(req, payload) {
  const outletId = normalizeOutletId(payload.outletId);
  const companyId = String(payload.companyId || '').trim() || null;
  const settings = Array.isArray(payload.gateways) ? payload.gateways : [];
  const admin = await authorizeGatewayAdmin(req, outletId);
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw httpError(
      501,
      'Server Supabase service credentials are missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      'SERVICE_ROLE_NOT_CONFIGURED'
    );
  }

  const existingRows = await loadGatewayRows(outletId);
  const savedGateways = [];

  for (const item of settings) {
    const gateway = normalizeGateway(item.gateway);
    const definitions = GATEWAY_FIELD_DEFINITIONS[gateway];
    const existing = existingRows.find((row) => row.gateway === gateway);
    const currentConfig = { ...((existing?.config_json || existing?.config || {}) ?? {}) };
    const incomingConfig = item.config && typeof item.config === 'object' ? item.config : {};
    const nextConfig = {};

    for (const definition of definitions) {
      const incoming = incomingConfig[definition.name];
      if (definition.secret && (incoming === undefined || incoming === '')) {
        if (currentConfig[definition.name]) nextConfig[definition.name] = currentConfig[definition.name];
        continue;
      }
      if (incoming !== undefined) {
        const value = String(incoming).trim();
        if (value) nextConfig[definition.name] = value;
        continue;
      }
      if (currentConfig[definition.name]) nextConfig[definition.name] = currentConfig[definition.name];
    }

    const row = {
      outlet_id: outletId,
      company_id: companyId || admin.company_id || null,
      gateway,
      is_enabled: Boolean(item.isEnabled),
      mode: item.mode === 'production' ? 'production' : 'sandbox',
      config_json: nextConfig,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('outlet_payment_gateway_settings')
      .upsert(row, { onConflict: 'outlet_id,gateway' })
      .select('*')
      .single();

    if (error) {
      throw httpError(500, error.message, 'GATEWAY_SETTINGS_SAVE_FAILED');
    }

    savedGateways.push(publicGatewaySetting(gateway, data, data.config_json || {}));
  }

  return {
    outletId,
    gateways: savedGateways,
    fields: GATEWAY_FIELD_DEFINITIONS,
  };
}

export function parseGatewayCallback(req, body) {
  const query = req.query || {};
  const gateway = String(query.gateway || body.gateway || '').toLowerCase();
  const orderId =
    body.ORDERID ||
    body.orderId ||
    body.merchantOrderId ||
    query.orderId ||
    query.providerOrderId ||
    '';
  const providerStatus = body.STATUS || body.status || body.state || query.gateway_status || 'PENDING';

  return {
    gateway,
    orderId,
    providerStatus,
  };
}

function createProviderOrderId(gateway) {
  const prefix = gateway === 'amazonpay' ? 'CPAMZ' : gateway === 'phonepe' ? 'CPPH' : 'CPPT';
  return `${prefix}${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`.slice(0, 48);
}

function normalizeGateway(gateway) {
  const normalized = String(gateway || '').toLowerCase();
  if (!SUPPORTED_GATEWAYS.has(normalized)) {
    throw httpError(400, 'Unsupported payment gateway.', 'UNSUPPORTED_GATEWAY');
  }
  return normalized;
}

function normalizeOutletId(outletId) {
  return String(outletId || 'current-outlet').trim() || 'current-outlet';
}

function normalizeOrderId(orderId) {
  const normalized = String(orderId || '').replace(/[^a-zA-Z0-9@_.-]/g, '').slice(0, 48);
  if (!normalized) {
    throw httpError(400, 'Missing payment order id.', 'MISSING_ORDER_ID');
  }
  return normalized;
}

function normalizeAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw httpError(400, 'Amount must be greater than zero.', 'INVALID_AMOUNT');
  }
  return numeric.toFixed(2);
}

function amountToPaise(amount) {
  return Math.round(Number(amount) * 100);
}

function cleanEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) return '';
  return String(value).trim();
}

function configValue(config, name) {
  const fromConfig = config?.[name];
  if (fromConfig !== undefined && fromConfig !== null && String(fromConfig).trim()) {
    return String(fromConfig).trim();
  }
  return cleanEnv(name);
}

function paymentMode(config = {}) {
  return configValue(config, 'PAYMENT_GATEWAY_MODE').toLowerCase() === 'production' ? 'production' : 'sandbox';
}

function requireConfig(gateway, config, names) {
  const missing = names.filter((name) => !configValue(config, name));
  if (missing.length) {
    throw httpError(
      501,
      `${gateway} is not configured yet. Add the missing outlet gateway settings.`,
      'GATEWAY_NOT_CONFIGURED',
      { gateway, missing }
    );
  }
}

function getSupabaseAdminClient() {
  const url = cleanEnv('SUPABASE_URL') || cleanEnv('VITE_SUPABASE_URL');
  const key = cleanEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function envGatewayConfig(gateway) {
  const config = { PAYMENT_GATEWAY_MODE: cleanEnv('PAYMENT_GATEWAY_MODE') };
  for (const definition of GATEWAY_FIELD_DEFINITIONS[gateway] || []) {
    const value = cleanEnv(definition.name);
    if (value) config[definition.name] = value;
  }
  if (gateway === 'amazonpay') {
    const keyPath = cleanEnv('AMAZON_PAY_PRIVATE_KEY_PATH');
    if (keyPath) config.AMAZON_PAY_PRIVATE_KEY_PATH = keyPath;
    const sandbox = cleanEnv('AMAZON_PAY_SANDBOX');
    if (sandbox) config.AMAZON_PAY_SANDBOX = sandbox;
  }
  return config;
}

async function loadGatewayRows(outletId) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('outlet_payment_gateway_settings')
    .select('*')
    .eq('outlet_id', outletId);

  if (error) {
    const message = String(error.message || '').toLowerCase();
    if (message.includes('does not exist') || message.includes('schema cache')) return [];
    throw httpError(500, error.message, 'GATEWAY_SETTINGS_READ_FAILED');
  }

  return data || [];
}

async function resolveGatewayConfig(gateway, outletId, options = {}) {
  const envConfig = envGatewayConfig(gateway);
  const rows = outletId ? await loadGatewayRows(outletId) : [];
  const row = rows.find((entry) => entry.gateway === gateway);
  const config = {
    ...envConfig,
    ...((row?.config_json || row?.config || {}) ?? {}),
    PAYMENT_GATEWAY_MODE: row?.mode || envConfig.PAYMENT_GATEWAY_MODE || 'sandbox',
  };

  if (row && options.requireEnabled && row.is_enabled === false) {
    throw httpError(403, `${GATEWAY_LABELS[gateway]} is disabled for this outlet.`, 'GATEWAY_DISABLED', {
      gateway,
      outletId,
    });
  }

  if (!row && options.requireEnabled && !isGatewayConfigured(gateway, config)) {
    throw httpError(
      501,
      `${GATEWAY_LABELS[gateway]} is not configured for this outlet.`,
      'GATEWAY_NOT_CONFIGURED',
      { gateway, outletId, missing: requiredFieldNames(gateway).filter((name) => !configValue(config, name)) }
    );
  }

  return config;
}

function requiredFieldNames(gateway) {
  return (GATEWAY_FIELD_DEFINITIONS[gateway] || [])
    .filter((definition) => definition.required)
    .map((definition) => definition.name);
}

function isGatewayConfigured(gateway, config) {
  return requiredFieldNames(gateway).every((name) => configValue(config, name));
}

function publicGatewaySetting(gateway, row, config) {
  const publicConfig = {};
  const savedSecrets = {};

  for (const definition of GATEWAY_FIELD_DEFINITIONS[gateway] || []) {
    const value = configValue(config, definition.name);
    if (definition.secret) {
      savedSecrets[definition.name] = Boolean(value);
      continue;
    }
    publicConfig[definition.name] = value;
  }

  return {
    gateway,
    label: GATEWAY_LABELS[gateway],
    isEnabled: row ? Boolean(row.is_enabled) : isGatewayConfigured(gateway, config),
    configured: isGatewayConfigured(gateway, config),
    mode: row?.mode || paymentMode(config),
    config: publicConfig,
    savedSecrets,
  };
}

async function authorizeGatewayAdmin(req, outletId) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw httpError(501, 'Server Supabase service credentials are missing.', 'SERVICE_ROLE_NOT_CONFIGURED');
  }

  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
  if (!token || token.startsWith('staff-')) {
    throw httpError(401, 'A Supabase admin session is required to save payment settings.', 'AUTH_REQUIRED');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    throw httpError(401, 'Invalid admin session.', 'AUTH_REQUIRED');
  }

  const { data: staff, error: staffError } = await supabase
    .from('users')
    .select('id, role, outlet_id, company_id, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (staffError || !staff?.is_active || !ADMIN_ROLES.has(staff.role)) {
    throw httpError(403, 'You do not have permission to manage payment gateways.', 'FORBIDDEN');
  }

  if (!['Super Admin', 'Admin'].includes(staff.role) && staff.outlet_id && String(staff.outlet_id) !== outletId) {
    throw httpError(403, 'You can only manage payment gateways for your outlet.', 'FORBIDDEN');
  }

  return staff;
}

function httpError(statusCode, message, code, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

function providerFetchError(gateway, response, data) {
  return httpError(
    502,
    `${gateway} returned an error while creating the payment.`,
    'GATEWAY_PROVIDER_ERROR',
    { gateway, providerStatus: response.status, providerResponse: data }
  );
}

function normalizeProviderStatus(gateway, rawStatus) {
  const normalized = String(rawStatus || '').toUpperCase();

  if (['TXN_SUCCESS', 'SUCCESS', 'COMPLETED', 'CAPTURED', 'AUTHORIZED', 'CHARGED'].includes(normalized)) {
    return { gateway, status: 'success', rawStatus };
  }

  if (['TXN_FAILURE', 'FAILED', 'FAILURE', 'EXPIRED', 'CANCELLED', 'DECLINED'].includes(normalized)) {
    return { gateway, status: 'failed', rawStatus };
  }

  if (['PENDING', 'PAYMENT_PENDING', 'INITIATED', 'OPEN'].includes(normalized)) {
    return { gateway, status: 'pending', rawStatus };
  }

  return { gateway, status: 'unknown', rawStatus };
}

function getPaytmHost(config) {
  return paymentMode(config) === 'production'
    ? 'https://secure.paytmpayments.com'
    : 'https://securestage.paytmpayments.com';
}

async function createPaytmPayment({ amount, orderId, baseUrl, payload, config, outletId }) {
  requireConfig('Paytm', config, ['PAYTM_MID', 'PAYTM_MERCHANT_KEY']);

  const mid = configValue(config, 'PAYTM_MID');
  const merchantKey = configValue(config, 'PAYTM_MERCHANT_KEY');
  const websiteName = configValue(config, 'PAYTM_WEBSITE') || (paymentMode(config) === 'production' ? 'DEFAULT' : 'WEBSTAGING');
  const callbackUrl =
    configValue(config, 'PAYTM_CALLBACK_URL') ||
    `${baseUrl}/api/payment-gateways/callback?gateway=paytm`;
  const customerId =
    payload?.customer?.phone?.replace(/\D/g, '') ||
    payload?.customer?.name?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) ||
    `CUST${Date.now()}`;

  const body = {
    requestType: 'Payment',
    mid,
    websiteName,
    orderId,
    callbackUrl,
    txnAmount: {
      value: amount,
      currency: 'INR',
    },
    userInfo: {
      custId: customerId,
      mobile: payload?.customer?.phone || undefined,
    },
  };

  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), merchantKey);
  const apiUrl =
    configValue(config, 'PAYTM_INITIATE_URL') ||
    `${getPaytmHost(config)}/theia/api/v1/initiateTransaction`;
  const response = await fetch(`${apiUrl}?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, head: { signature } }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.body?.resultInfo?.resultStatus === 'F' || !data?.body?.txnToken) {
    throw providerFetchError('Paytm', response, data);
  }

  const checkoutHost = configValue(config, 'PAYTM_CHECKOUT_HOST') || getPaytmHost(config);

  return {
    gateway: 'paytm',
    status: 'created',
    providerOrderId: orderId,
    amount,
    currency: 'INR',
    nextAction: 'paytm_checkout',
    checkout: {
      mid,
      orderId,
      amount,
      txnToken: data.body.txnToken,
      scriptUrl: `${checkoutHost}/merchantpgpui/checkoutjs/merchants/${mid}.js`,
    },
    expiresInSeconds: 900,
    providerStatus: data.body.resultInfo,
    outletId,
  };
}

async function getPaytmPaymentStatus(orderId, config) {
  requireConfig('Paytm', config, ['PAYTM_MID', 'PAYTM_MERCHANT_KEY']);

  const mid = configValue(config, 'PAYTM_MID');
  const body = { mid, orderId };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), configValue(config, 'PAYTM_MERCHANT_KEY'));
  const statusUrl = configValue(config, 'PAYTM_STATUS_URL') || `${getPaytmHost(config)}/v3/order/status`;
  const response = await fetch(statusUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, head: { signature } }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw providerFetchError('Paytm', response, data);

  const result = normalizeProviderStatus('paytm', data?.body?.resultInfo?.resultStatus);
  return {
    ...result,
    providerOrderId: orderId,
    providerTransactionId: data?.body?.txnId || data?.body?.bankTxnId || '',
    providerResponse: data?.body || data,
  };
}

function getPhonePeUrls(config) {
  if (paymentMode(config) === 'production') {
    return {
      auth: configValue(config, 'PHONEPE_AUTH_URL') || 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
      pay: configValue(config, 'PHONEPE_PAY_URL') || 'https://api.phonepe.com/apis/pg/checkout/v2/pay',
      statusBase: configValue(config, 'PHONEPE_STATUS_BASE_URL') || 'https://api.phonepe.com/apis/pg/checkout/v2/order',
    };
  }

  return {
    auth: configValue(config, 'PHONEPE_AUTH_URL') || 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
    pay: configValue(config, 'PHONEPE_PAY_URL') || 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
    statusBase:
      configValue(config, 'PHONEPE_STATUS_BASE_URL') ||
      'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order',
  };
}

async function getPhonePeAccessToken(config) {
  requireConfig('PhonePe', config, ['PHONEPE_CLIENT_ID', 'PHONEPE_CLIENT_VERSION', 'PHONEPE_CLIENT_SECRET']);

  const urls = getPhonePeUrls(config);
  const response = await fetch(urls.auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: configValue(config, 'PHONEPE_CLIENT_ID'),
      client_version: configValue(config, 'PHONEPE_CLIENT_VERSION'),
      client_secret: configValue(config, 'PHONEPE_CLIENT_SECRET'),
      grant_type: 'client_credentials',
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !(data.access_token || data?.data?.access_token)) {
    throw providerFetchError('PhonePe', response, data);
  }

  return data.access_token || data.data.access_token;
}

async function createPhonePePayment({ amount, orderId, baseUrl, config, outletId }) {
  const token = await getPhonePeAccessToken(config);
  const urls = getPhonePeUrls(config);
  const redirectUrl =
    configValue(config, 'PHONEPE_REDIRECT_URL') ||
    `${baseUrl}/erp/pos/checkout?payment_gateway=phonepe&providerOrderId=${encodeURIComponent(orderId)}`;

  const response = await fetch(urls.pay, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `O-Bearer ${token}`,
    },
    body: JSON.stringify({
      merchantOrderId: orderId,
      amount: amountToPaise(amount),
      expireAfter: Number(configValue(config, 'PHONEPE_EXPIRE_AFTER_SECONDS') || 1200),
      paymentFlow: {
        type: 'PG_CHECKOUT',
        merchantUrls: {
          redirectUrl,
        },
      },
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw providerFetchError('PhonePe', response, data);

  const providerRedirectUrl =
    data.redirectUrl ||
    data?.data?.redirectUrl ||
    data?.paymentUrl ||
    data?.data?.paymentUrl ||
    data?.instrumentResponse?.redirectInfo?.url ||
    data?.data?.instrumentResponse?.redirectInfo?.url ||
    '';

  return {
    gateway: 'phonepe',
    status: 'created',
    providerOrderId: orderId,
    amount,
    currency: 'INR',
    nextAction: providerRedirectUrl ? 'redirect' : 'provider_console',
    redirectUrl: providerRedirectUrl,
    providerStatus: data.state || data.status || data?.data?.state || 'CREATED',
    providerResponse: data,
    outletId,
  };
}

async function getPhonePePaymentStatus(orderId, config) {
  const token = await getPhonePeAccessToken(config);
  const urls = getPhonePeUrls(config);
  const response = await fetch(`${urls.statusBase}/${encodeURIComponent(orderId)}/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `O-Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw providerFetchError('PhonePe', response, data);

  const rawStatus = data.state || data.status || data?.data?.state || data?.data?.status;
  const result = normalizeProviderStatus('phonepe', rawStatus);
  return {
    ...result,
    providerOrderId: orderId,
    providerTransactionId: data.transactionId || data?.data?.transactionId || '',
    providerResponse: data,
  };
}

function getAmazonPrivateKey(config) {
  const inlineKey = configValue(config, 'AMAZON_PAY_PRIVATE_KEY');
  if (inlineKey) return inlineKey.replace(/\\n/g, '\n');

  const keyPath = configValue(config, 'AMAZON_PAY_PRIVATE_KEY_PATH');
  if (keyPath) return fs.readFileSync(keyPath);

  return '';
}

function createAmazonConfig(config) {
  requireConfig('Amazon Pay', config, ['AMAZON_PAY_PUBLIC_KEY_ID', 'AMAZON_PAY_STORE_ID']);

  const privateKey = getAmazonPrivateKey(config);
  if (!privateKey) {
    throw httpError(501, 'Amazon Pay private key is not configured.', 'GATEWAY_NOT_CONFIGURED', {
      gateway: 'amazonpay',
      missing: ['AMAZON_PAY_PRIVATE_KEY or AMAZON_PAY_PRIVATE_KEY_PATH'],
    });
  }

  const region = AMAZON_REGION_MAP[(configValue(config, 'AMAZON_PAY_REGION') || 'eu').toLowerCase()] || 'eu';

  return {
    publicKeyId: configValue(config, 'AMAZON_PAY_PUBLIC_KEY_ID'),
    privateKey,
    region,
    host: AMAZON_API_ENDPOINTS[region],
    sandbox: configValue(config, 'AMAZON_PAY_SANDBOX') !== 'false',
  };
}

function createAmazonApiPath(amazonConfig, urlFragment) {
  const publicKeyId = amazonConfig.publicKeyId.toUpperCase();
  if (publicKeyId.startsWith('LIVE') || publicKeyId.startsWith('SANDBOX')) {
    return `${AMAZON_API_VERSION}/${urlFragment}`;
  }

  return `${amazonConfig.sandbox ? 'sandbox' : 'live'}/${AMAZON_API_VERSION}/${urlFragment}`;
}

function amazonTimestamp() {
  return new Date().toISOString().split('.')[0] + 'Z';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value || '').digest('hex');
}

function amazonCanonicalQuery(params) {
  if (!params) return '';
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
}

function signAmazonRequest(amazonConfig, options) {
  const payload = options.payload || '';
  const headers = {
    ...(options.headers || {}),
    'x-amz-pay-region': amazonConfig.region,
    'x-amz-pay-host': amazonConfig.host,
    'x-amz-pay-date': amazonTimestamp(),
    'content-type': 'application/json',
    accept: 'application/json',
    'user-agent': `cafepilots/${process.versions.node}; ${process.platform}`,
  };
  const sortedHeaderKeys = Object.keys(headers)
    .map((key) => key.toLowerCase())
    .sort((a, b) => a.localeCompare(b));
  const headerValues = Object.keys(headers).reduce((acc, key) => {
    acc[key.toLowerCase()] = headers[key];
    return acc;
  }, {});
  const signedHeaders = sortedHeaderKeys.join(';');
  const canonicalHeaders = sortedHeaderKeys.map((key) => `${key}:${headerValues[key]}`).join('\n');
  const canonicalRequest = [
    options.method,
    `/${options.path}`,
    amazonCanonicalQuery(options.queryParams),
    `${canonicalHeaders}\n`,
    signedHeaders,
    sha256(payload),
  ].join('\n');
  const stringToSign = `${AMAZON_SIGNATURE_ALGORITHM}\n${sha256(canonicalRequest)}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(stringToSign)
    .sign(
      {
        key: amazonConfig.privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      'base64'
    );

  return {
    ...headers,
    authorization: `${AMAZON_SIGNATURE_ALGORITHM} PublicKeyId=${amazonConfig.publicKeyId}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function amazonApiRequest(config, { method, urlFragment, payload = null, headers = null }) {
  const amazonConfig = createAmazonConfig(config);
  const path = createAmazonApiPath(amazonConfig, urlFragment);
  const body = method === 'GET' ? '' : JSON.stringify(payload || {});
  const signedHeaders = signAmazonRequest(amazonConfig, {
    method,
    path,
    payload: body,
    headers,
  });
  const response = await fetch(`https://${amazonConfig.host}/${path}`, {
    method,
    headers: signedHeaders,
    ...(method === 'GET' ? {} : { body }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw providerFetchError('Amazon Pay', response, data);
  return data;
}

async function createAmazonPayPayment({ amount, orderId, baseUrl, config, outletId }) {
  const returnUrl =
    configValue(config, 'AMAZON_PAY_RETURN_URL') ||
    `${baseUrl}/erp/pos/checkout?payment_gateway=amazonpay&providerOrderId=${encodeURIComponent(orderId)}`;
  const data = await amazonApiRequest(config, {
    method: 'POST',
    urlFragment: 'checkoutSessions',
    headers: {
      'x-amz-pay-idempotency-key': crypto.randomUUID().replace(/-/g, ''),
    },
    payload: {
      webCheckoutDetails: {
        checkoutReviewReturnUrl: returnUrl,
        checkoutResultReturnUrl: returnUrl,
      },
      storeId: configValue(config, 'AMAZON_PAY_STORE_ID'),
      paymentDetails: {
        paymentIntent: 'Confirm',
        canHandlePendingAuthorization: false,
        chargeAmount: {
          amount,
          currencyCode: 'INR',
        },
      },
      merchantMetadata: {
        merchantReferenceId: orderId,
        merchantStoreName: configValue(config, 'AMAZON_PAY_STORE_NAME') || 'CafePilots',
        noteToBuyer: 'CafePilots POS order',
      },
    },
  });
  const redirectUrl = data?.webCheckoutDetails?.amazonPayRedirectUrl || '';

  return {
    gateway: 'amazonpay',
    status: 'created',
    providerOrderId: orderId,
    providerSessionId: data.checkoutSessionId || '',
    amount,
    currency: 'INR',
    nextAction: redirectUrl ? 'redirect' : 'provider_console',
    redirectUrl,
    providerStatus: data?.statusDetails?.state || 'Open',
    providerResponse: data,
    outletId,
  };
}

async function getAmazonPaymentStatus(checkoutSessionId, config) {
  const data = await amazonApiRequest(config, {
    method: 'GET',
    urlFragment: `checkoutSessions/${checkoutSessionId}`,
  });
  const result = normalizeProviderStatus('amazonpay', data?.statusDetails?.state);

  return {
    ...result,
    providerSessionId: checkoutSessionId,
    providerOrderId: data?.merchantMetadata?.merchantReferenceId || '',
    providerTransactionId: data?.chargePermissionId || '',
    providerResponse: data,
  };
}
