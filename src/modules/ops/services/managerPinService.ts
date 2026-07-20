import { supabase } from '@/lib/supabase';
import { sha256Hex } from '../lib/validators';
import { writeAuditLog } from './auditService';
import type { OutletOpsSettings } from '../types';
import { DEFAULT_OPS_SETTINGS } from '../types';

const LOCAL_PIN_KEY = 'cafepilots-manager-pin-hash';
const LOCAL_SETTINGS_KEY = 'cafepilots-ops-settings';

export async function hashManagerPin(pin: string): Promise<string> {
  return sha256Hex(`cafepilots:manager-pin:${pin.trim()}`);
}

export async function loadOpsSettings(outletId: string | null | undefined): Promise<OutletOpsSettings> {
  const base = {
    outletId: outletId || 'local',
    ...DEFAULT_OPS_SETTINGS,
    managerPinConfigured: Boolean(localStorage.getItem(LOCAL_PIN_KEY)),
  };

  if (!outletId) {
    try {
      const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (raw) return { ...base, ...JSON.parse(raw), outletId: 'local' };
    } catch {
      /* ignore */
    }
    return base;
  }

  try {
    const { data, error } = await supabase
      .from('outlet_ops_settings')
      .select('*')
      .eq('outlet_id', outletId)
      .maybeSingle();

    if (error || !data) {
      try {
        const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
        if (raw) return { ...base, ...JSON.parse(raw), outletId };
      } catch {
        /* ignore */
      }
      return base;
    }

    return {
      outletId,
      inventoryTrackingEnabled: data.inventory_tracking_enabled !== false,
      allowNegativeStock: Boolean(data.allow_negative_stock),
      discountPinThresholdPct: Number(data.discount_pin_threshold_pct ?? 10),
      managerPinConfigured: Boolean(data.manager_pin_hash) || Boolean(localStorage.getItem(LOCAL_PIN_KEY)),
    };
  } catch {
    return base;
  }
}

export async function saveOpsSettings(
  outletId: string | null | undefined,
  patch: Partial<OutletOpsSettings>,
  userId?: string | null
): Promise<void> {
  const next = { ...(await loadOpsSettings(outletId)), ...patch };
  localStorage.setItem(
    LOCAL_SETTINGS_KEY,
    JSON.stringify({
      inventoryTrackingEnabled: next.inventoryTrackingEnabled,
      allowNegativeStock: next.allowNegativeStock,
      discountPinThresholdPct: next.discountPinThresholdPct,
    })
  );

  if (!outletId) return;

  await supabase.from('outlet_ops_settings').upsert(
    {
      outlet_id: outletId,
      inventory_tracking_enabled: next.inventoryTrackingEnabled,
      allow_negative_stock: next.allowNegativeStock,
      discount_pin_threshold_pct: next.discountPinThresholdPct,
      updated_at: new Date().toISOString(),
      updated_by: userId || null,
    },
    { onConflict: 'outlet_id' }
  );
}

export async function setManagerPin(
  pin: string,
  outletId?: string | null,
  userId?: string | null
): Promise<void> {
  if (!/^\d{4,8}$/.test(pin.trim())) {
    throw new Error('Manager PIN must be 4–8 digits.');
  }
  const hash = await hashManagerPin(pin);
  localStorage.setItem(LOCAL_PIN_KEY, hash);

  if (outletId) {
    await supabase.from('outlet_ops_settings').upsert(
      {
        outlet_id: outletId,
        manager_pin_hash: hash,
        updated_at: new Date().toISOString(),
        updated_by: userId || null,
      },
      { onConflict: 'outlet_id' }
    );
  }
}

export type ManagerApprovalResult =
  | { ok: true; approvalId: string | null }
  | { ok: false; message: string };

/**
 * Verify manager PIN. If no PIN configured, allow with warning for first-run (dev),
 * but still write an approval row when possible.
 */
export async function verifyManagerPin(params: {
  pin: string;
  outletId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  requestedBy?: string | null;
  payload?: unknown;
}): Promise<ManagerApprovalResult> {
  const stored =
    localStorage.getItem(LOCAL_PIN_KEY) ||
    (await fetchRemotePinHash(params.outletId));

  if (!stored) {
    // First-run: require setting PIN before sensitive ops in production feel —
    // allow once with empty hash only if pin is the bootstrap code "0000"
    if (params.pin.trim() === '0000') {
      const approvalId = await recordApproval(params, 'bootstrap');
      return { ok: true, approvalId };
    }
    return {
      ok: false,
      message: 'Manager PIN not set. Configure it in Settings (Ops) or use bootstrap PIN 0000 once.',
    };
  }

  const hash = await hashManagerPin(params.pin);
  if (hash !== stored) {
    await writeAuditLog({
      outletId: params.outletId,
      userId: params.requestedBy,
      action: 'manager_override',
      entityType: params.entityType,
      entityId: params.entityId,
      reason: 'Invalid manager PIN attempt',
      newValue: { action: params.action },
    });
    return { ok: false, message: 'Invalid manager PIN.' };
  }

  const approvalId = await recordApproval(params, 'verified');
  await writeAuditLog({
    outletId: params.outletId,
    userId: params.requestedBy,
    action: 'manager_override',
    entityType: params.entityType,
    entityId: params.entityId,
    reason: params.action,
    managerApprovalId: approvalId,
    newValue: params.payload ?? { action: params.action },
  });

  return { ok: true, approvalId };
}

async function fetchRemotePinHash(outletId?: string | null): Promise<string | null> {
  if (!outletId) return null;
  try {
    const { data } = await supabase
      .from('outlet_ops_settings')
      .select('manager_pin_hash')
      .eq('outlet_id', outletId)
      .maybeSingle();
    return data?.manager_pin_hash || null;
  } catch {
    return null;
  }
}

async function recordApproval(
  params: {
    outletId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string | null;
    requestedBy?: string | null;
    payload?: unknown;
  },
  approvedByName: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('manager_approvals')
      .insert([
        {
          outlet_id: params.outletId || null,
          action: params.action,
          entity_type: params.entityType || null,
          entity_id: params.entityId || null,
          requested_by: params.requestedBy || null,
          approved_by_name: approvedByName,
          payload: params.payload ?? null,
        },
      ])
      .select('id')
      .single();
    if (error) return null;
    return data?.id || null;
  } catch {
    return null;
  }
}
