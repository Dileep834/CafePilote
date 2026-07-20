import type { OnlinePlatformId, PlatformDefinition } from './types';

/**
 * Registry — enable a new marketplace by adding one entry.
 * UI reads this; no card/bar redesign required.
 */
export const ONLINE_PLATFORMS: PlatformDefinition[] = [
  {
    id: 'swiggy',
    label: 'Swiggy',
    color: '#FC8019',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    ring: 'ring-orange-200',
    glyph: 'Sg',
    sound: 'swiggy',
    enabled: true,
  },
  {
    id: 'zomato',
    label: 'Zomato',
    color: '#E23744',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    ring: 'ring-rose-200',
    glyph: 'Zm',
    sound: 'zomato',
    enabled: true,
  },
  {
    id: 'ondc',
    label: 'ONDC',
    color: '#2563EB',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    ring: 'ring-blue-200',
    glyph: 'ON',
    sound: 'website',
    enabled: true,
  },
  {
    id: 'website',
    label: 'Website',
    color: '#16A34A',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    ring: 'ring-emerald-200',
    glyph: 'Web',
    sound: 'website',
    enabled: true,
  },
  {
    id: 'qr',
    label: 'QR Menu',
    color: '#7C3AED',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    ring: 'ring-violet-200',
    glyph: 'QR',
    sound: 'website',
    enabled: true,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    glyph: 'WA',
    sound: 'website',
    enabled: true,
  },
  {
    id: 'phone',
    label: 'Phone',
    color: '#64748B',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    ring: 'ring-slate-200',
    glyph: 'Ph',
    sound: 'high_priority',
    enabled: true,
  },
  {
    id: 'walk_in',
    label: 'Walk-in',
    color: '#0D1B2A',
    bg: 'bg-slate-900',
    text: 'text-white',
    ring: 'ring-slate-700',
    glyph: 'POS',
    sound: 'website',
    enabled: false,
  },
  // Future — disabled until connected
  {
    id: 'ubereats',
    label: 'Uber Eats',
    color: '#06C167',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    glyph: 'UE',
    sound: 'website',
    enabled: false,
  },
  {
    id: 'magicpin',
    label: 'Magicpin',
    color: '#FF2E63',
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    ring: 'ring-pink-200',
    glyph: 'Mp',
    sound: 'website',
    enabled: false,
  },
  {
    id: 'blinkit',
    label: 'Blinkit',
    color: '#F8C301',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    glyph: 'Bk',
    sound: 'website',
    enabled: false,
  },
  {
    id: 'zepto',
    label: 'Zepto Cafe',
    color: '#7C3AED',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    ring: 'ring-violet-200',
    glyph: 'Zp',
    sound: 'website',
    enabled: false,
  },
];

const byId = Object.fromEntries(ONLINE_PLATFORMS.map((p) => [p.id, p])) as Record<
  OnlinePlatformId,
  PlatformDefinition
>;

export function getPlatform(id: OnlinePlatformId): PlatformDefinition {
  return byId[id] || byId.website;
}

export function enabledPlatforms() {
  return ONLINE_PLATFORMS.filter((p) => p.enabled);
}

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  rejected: 'Rejected',
  expired: 'Expired',
};

export const PAYMENT_LABELS: Record<string, string> = {
  prepaid: 'PREPAID',
  cod: 'COD',
  online: 'ONLINE',
  card: 'CARD',
};
