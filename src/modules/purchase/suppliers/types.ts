export const SUPPLIER_CATEGORIES = [
  'Dairy',
  'Vegetables',
  'Meat',
  'Frozen Foods',
  'Bakery',
  'Packaging',
  'Cleaning Supplies',
  'Beverages',
  'Coffee',
  'Miscellaneous',
] as const;

export const PAYMENT_TERMS = [
  { value: 'Cash', label: 'Cash' },
  { value: '7 Days', label: '7 Days' },
  { value: '15 Days', label: '15 Days' },
  { value: '30 Days', label: '30 Days' },
  { value: '45 Days', label: '45 Days' },
  { value: '60 Days', label: '60 Days' },
] as const;

export const DELIVERY_TIMES = [
  { value: 'Morning', label: 'Morning' },
  { value: 'Afternoon', label: 'Afternoon' },
  { value: 'Evening', label: 'Evening' },
] as const;

export type SupplierStatus = 'active' | 'inactive';

export type SupplierFormValues = {
  name: string;
  category: string;
  preferred_supplier: boolean;
  status: SupplierStatus;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  gst_number: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  payment_terms: string;
  preferred_delivery_time: string;
  notes: string;
};

export type SupplierFormErrors = Partial<Record<keyof SupplierFormValues, string>>;

export const EMPTY_SUPPLIER_FORM: SupplierFormValues = {
  name: '',
  category: '',
  preferred_supplier: false,
  status: 'active',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  gst_number: '',
  address: '',
  city: '',
  state: '',
  pin_code: '',
  payment_terms: '',
  preferred_delivery_time: '',
  notes: '',
};

/** Payload persisted to suppliers table (core + optional extended columns). */
export type SupplierCreatePayload = {
  name: string;
  category: string;
  contact_name: string;
  phone: string;
  address: string;
  is_active: boolean;
  email?: string | null;
  website?: string | null;
  gst_number?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  payment_terms?: string | null;
  preferred_delivery_time?: string | null;
  preferred_supplier?: boolean;
  notes?: string | null;
};
