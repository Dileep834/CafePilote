import type { OnlineAlert, OnlineOrder, PlatformConnection } from './types';
import { enabledPlatforms } from './platforms';

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const isoFuture = (msAhead: number) => new Date(now + msAhead).toISOString();

function money(total: number, commissionRate = 0.22) {
  const subtotal = Math.round(total / 1.05);
  const tax = total - subtotal;
  const packing = 15;
  const delivery = 0;
  const discount = 0;
  const platformCommission = Math.round(total * commissionRate);
  return {
    subtotal,
    discount,
    tax,
    packing,
    delivery,
    platformCommission,
    total,
    earnings: total - platformCommission,
  };
}

/** Seed demo orders for high-volume POS preview */
export const SEED_ORDERS: OnlineOrder[] = [
  {
    id: 'oo-1',
    externalId: 'SG-12891',
    platformId: 'swiggy',
    status: 'new',
    payment: 'prepaid',
    customer: {
      name: 'Rahul Sharma',
      phone: '98765 43210',
      address: '12 MG Road, Indiranagar',
      landmark: 'Near Metro',
      instructions: 'Extra napkins',
      orderCount: 14,
    },
    items: [
      { id: 'i1', name: 'Chicken Biryani', quantity: 1, unitPrice: 320, modifiers: ['Spicy'] },
      { id: 'i2', name: 'Butter Naan', quantity: 2, unitPrice: 60 },
      { id: 'i3', name: 'Mango Lassi', quantity: 1, unitPrice: 120 },
    ],
    money: money(689, 0.24),
    kitchenMinutes: 18,
    acceptWithinSec: 90,
    createdAt: iso(35_000),
    pickupEtaAt: isoFuture(12 * 60_000),
    partner: { name: 'Unassigned', status: 'unassigned' },
    priority: 'normal',
  },
  {
    id: 'oo-2',
    externalId: 'ZM-9811',
    platformId: 'zomato',
    status: 'new',
    payment: 'cod',
    customer: {
      name: 'Priya Nair',
      phone: '98111 22334',
      address: '45 100 Feet Rd',
      orderCount: 3,
    },
    items: [
      { id: 'i1', name: 'Paneer Tikka', quantity: 1, unitPrice: 280 },
      { id: 'i2', name: 'Jeera Rice', quantity: 1, unitPrice: 140 },
    ],
    money: money(420, 0.2),
    kitchenMinutes: 15,
    acceptWithinSec: 60,
    createdAt: iso(12_000),
    pickupEtaAt: isoFuture(18 * 60_000),
    partner: { name: 'Ravi K', phone: '99000 11122', vehicle: 'Bike', etaMinutes: 18, status: 'assigned' },
    priority: 'high',
  },
  {
    id: 'oo-3',
    externalId: 'WEB-4402',
    platformId: 'website',
    status: 'new',
    payment: 'online',
    customer: {
      name: 'Amit Patel',
      phone: '97654 32109',
      address: 'Pickup — Counter',
      instructions: 'Customer waiting',
      orderCount: 8,
    },
    items: [
      { id: 'i1', name: 'Cappuccino', quantity: 2, unitPrice: 180 },
      { id: 'i2', name: 'Croissant', quantity: 1, unitPrice: 90 },
    ],
    money: money(450, 0),
    kitchenMinutes: 8,
    acceptWithinSec: 120,
    createdAt: iso(8_000),
    pickupEtaAt: isoFuture(10 * 60_000),
    partner: null,
    notes: 'Direct website order',
  },
  {
    id: 'oo-4',
    externalId: 'ONDC-772',
    platformId: 'ondc',
    status: 'preparing',
    payment: 'prepaid',
    customer: { name: 'Sneha R', phone: '98888 77665', address: 'Koramangala 5th Block', orderCount: 2 },
    items: [
      { id: 'i1', name: 'Masala Dosa', quantity: 2, unitPrice: 140 },
      { id: 'i2', name: 'Filter Coffee', quantity: 2, unitPrice: 80 },
    ],
    money: money(440, 0.15),
    kitchenMinutes: 12,
    createdAt: iso(20 * 60_000),
    acceptedAt: iso(18 * 60_000),
    prepStartedAt: iso(17 * 60_000),
    pickupEtaAt: isoFuture(5 * 60_000),
    partner: { name: 'ONDC Rider', phone: '90000 55544', vehicle: 'Scooter', etaMinutes: 5, status: 'assigned' },
  },
  {
    id: 'oo-5',
    externalId: 'SG-12840',
    platformId: 'swiggy',
    status: 'ready',
    payment: 'prepaid',
    customer: { name: 'Vikram S', phone: '91234 56780', address: 'HSR Layout', orderCount: 22 },
    items: [
      { id: 'i1', name: 'Veg Thali', quantity: 1, unitPrice: 250 },
      { id: 'i2', name: 'Gulab Jamun', quantity: 2, unitPrice: 80 },
    ],
    money: money(410, 0.24),
    kitchenMinutes: 14,
    createdAt: iso(35 * 60_000),
    acceptedAt: iso(33 * 60_000),
    prepStartedAt: iso(32 * 60_000),
    readyAt: iso(4 * 60_000),
    pickupEtaAt: isoFuture(2 * 60_000),
    partner: { name: 'Arjun M', phone: '91111 22233', vehicle: 'Bike', etaMinutes: 2, status: 'arrived' },
  },
  {
    id: 'oo-6',
    externalId: 'PH-901',
    platformId: 'phone',
    status: 'accepted',
    payment: 'card',
    customer: { name: 'Mrs. Kapoor', phone: '99887 76655', address: 'Pickup — Phone order', orderCount: 41 },
    items: [{ id: 'i1', name: 'Family Combo', quantity: 1, unitPrice: 999 }],
    money: money(999, 0),
    kitchenMinutes: 25,
    createdAt: iso(8 * 60_000),
    acceptedAt: iso(7 * 60_000),
    prepStartedAt: iso(7 * 60_000),
    pickupEtaAt: isoFuture(20 * 60_000),
    partner: null,
  },
  {
    id: 'oo-7',
    externalId: 'QR-551',
    platformId: 'qr',
    status: 'delivered',
    payment: 'online',
    customer: { name: 'Table QR Guest', phone: '', address: 'Dine-in QR', orderCount: 1 },
    items: [
      { id: 'i1', name: 'Cold Brew', quantity: 1, unitPrice: 220 },
      { id: 'i2', name: 'Brownie', quantity: 1, unitPrice: 160 },
    ],
    money: money(380, 0),
    kitchenMinutes: 6,
    createdAt: iso(90 * 60_000),
    acceptedAt: iso(88 * 60_000),
    readyAt: iso(80 * 60_000),
    pickupEtaAt: iso(75 * 60_000),
  },
  {
    id: 'oo-8',
    externalId: 'ZM-9702',
    platformId: 'zomato',
    status: 'cancelled',
    payment: 'cod',
    customer: { name: 'Deepak', phone: '90909 80808', address: 'Whitefield', orderCount: 1 },
    items: [{ id: 'i1', name: 'Chicken Wings', quantity: 1, unitPrice: 350 }],
    money: money(350, 0.2),
    kitchenMinutes: 20,
    createdAt: iso(50 * 60_000),
    notes: 'Customer cancelled',
  },
  {
    id: 'oo-9',
    externalId: 'WA-220',
    platformId: 'whatsapp',
    status: 'preparing',
    payment: 'prepaid',
    customer: {
      name: 'Neha G',
      phone: '98700 11223',
      address: 'Jayanagar 4th Block',
      instructions: 'Call on arrival',
      orderCount: 6,
    },
    items: [
      { id: 'i1', name: 'Margherita Pizza', quantity: 1, unitPrice: 399 },
      { id: 'i2', name: 'Garlic Bread', quantity: 1, unitPrice: 149 },
    ],
    money: money(548, 0),
    kitchenMinutes: 20,
    createdAt: iso(15 * 60_000),
    acceptedAt: iso(14 * 60_000),
    prepStartedAt: iso(13 * 60_000),
    pickupEtaAt: isoFuture(8 * 60_000),
  },
  {
    id: 'oo-10',
    externalId: 'SG-12701',
    platformId: 'swiggy',
    status: 'refunded',
    payment: 'prepaid',
    customer: { name: 'Karan', phone: '90012 34567', address: 'BTM', orderCount: 5 },
    items: [{ id: 'i1', name: 'Pasta Alfredo', quantity: 1, unitPrice: 320 }],
    money: money(320, 0.24),
    kitchenMinutes: 15,
    createdAt: iso(120 * 60_000),
  },
];

export const SEED_CONNECTIONS: PlatformConnection[] = enabledPlatforms().map((p) => ({
  platformId: p.id,
  connected: !['phone'].includes(p.id) || true,
  lastSyncAt: iso(30_000),
}));

// Demo: mark one platform occasionally "at risk" — phone always connected for ops
SEED_CONNECTIONS.forEach((c) => {
  if (c.platformId === 'ondc') {
    // keep connected by default
  }
});

export const SEED_ALERTS: OnlineAlert[] = [
  {
    id: 'al-1',
    kind: 'new_order',
    title: 'New Swiggy order',
    body: 'Order #SG-12891 · ₹689',
    orderId: 'oo-1',
    platformId: 'swiggy',
    createdAt: iso(35_000),
    read: false,
  },
  {
    id: 'al-2',
    kind: 'driver_arrived',
    title: 'Rider arrived',
    body: 'Arjun M waiting for #SG-12840',
    orderId: 'oo-5',
    platformId: 'swiggy',
    createdAt: iso(90_000),
    read: false,
  },
  {
    id: 'al-3',
    kind: 'late_pickup',
    title: 'Pickup running late',
    body: 'ONDC #ONDC-772 pickup overdue risk',
    orderId: 'oo-4',
    platformId: 'ondc',
    createdAt: iso(120_000),
    read: true,
  },
  {
    id: 'al-4',
    kind: 'cancelled',
    title: 'Order cancelled',
    body: 'Zomato #ZM-9702 cancelled by customer',
    orderId: 'oo-8',
    platformId: 'zomato',
    createdAt: iso(50 * 60_000),
    read: true,
  },
];

let seq = 12900;

export function createDemoIncomingOrder(): OnlineOrder {
  seq += 1;
  const platforms = ['swiggy', 'zomato', 'website', 'ondc', 'qr'] as const;
  const platformId = platforms[Math.floor(Math.random() * platforms.length)];
  const total = 250 + Math.floor(Math.random() * 700);
  const id = `oo-${Date.now()}`;
  const prefix =
    platformId === 'swiggy'
      ? 'SG'
      : platformId === 'zomato'
        ? 'ZM'
        : platformId === 'ondc'
          ? 'ONDC'
          : platformId === 'qr'
            ? 'QR'
            : 'WEB';

  return {
    id,
    externalId: `${prefix}-${seq}`,
    platformId,
    status: 'new',
    payment: Math.random() > 0.35 ? 'prepaid' : 'cod',
    customer: {
      name: ['Ananya', 'Rohit', 'Meera', 'Kabir', 'Isha'][Math.floor(Math.random() * 5)],
      phone: '98XXX XXXXX',
      address: 'Demo delivery address',
      orderCount: 1 + Math.floor(Math.random() * 20),
    },
    items: [
      { id: 'd1', name: 'Chef Special', quantity: 1 + Math.floor(Math.random() * 2), unitPrice: total * 0.6 },
      { id: 'd2', name: 'Side', quantity: 1, unitPrice: total * 0.4 },
    ],
    money: money(total, platformId === 'website' || platformId === 'qr' ? 0 : 0.22),
    kitchenMinutes: 12 + Math.floor(Math.random() * 10),
    acceptWithinSec: platformId === 'zomato' ? 60 : 90,
    createdAt: new Date().toISOString(),
    pickupEtaAt: isoFuture((10 + Math.floor(Math.random() * 15)) * 60_000),
    partner: { name: 'Assigning…', status: 'unassigned' },
    priority: Math.random() > 0.85 ? 'high' : 'normal',
  };
}
