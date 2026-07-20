import type { SupplierFormErrors, SupplierFormValues } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Indian GSTIN: 2 digit state + 10 PAN + entity + Z + checksum */
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

/** Format Indian mobile as +91 XXXXX XXXXX while typing. */
export function formatIndianPhone(raw: string) {
  let digits = digitsOnly(raw);
  if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
  digits = digits.slice(0, 10);
  if (digits.length <= 5) return digits.length ? `+91 ${digits}` : '';
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function isValidIndianMobile(phone: string) {
  const digits = digitsOnly(phone);
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local);
}

export function isValidEmail(email: string) {
  if (!email.trim()) return true;
  return EMAIL_RE.test(email.trim());
}

export function isValidGst(gst: string) {
  if (!gst.trim()) return true;
  return GST_RE.test(gst.trim().toUpperCase());
}

export function validateSupplierForm(values: SupplierFormValues): SupplierFormErrors {
  const errors: SupplierFormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Company Name is required.';
  else if (name.length > 100) errors.name = 'Company Name must be 100 characters or less.';

  if (!values.category.trim()) errors.category = 'Supplier Category is required.';

  if (!values.phone.trim()) errors.phone = 'Phone Number is required.';
  else if (!isValidIndianMobile(values.phone)) errors.phone = 'Phone number is invalid.';

  if (values.email.trim() && !isValidEmail(values.email)) {
    errors.email = 'Email format is incorrect.';
  }

  if (values.gst_number.trim() && !isValidGst(values.gst_number)) {
    errors.gst_number = 'GST number format is invalid.';
  }

  if (values.pin_code.trim() && !/^\d{6}$/.test(values.pin_code.trim())) {
    errors.pin_code = 'PIN Code must be 6 digits.';
  }

  if (values.website.trim()) {
    const w = values.website.trim();
    if (!/^https?:\/\//i.test(w) && !/^[a-z0-9.-]+\.[a-z]{2,}/i.test(w)) {
      errors.website = 'Website format is incorrect.';
    }
  }

  return errors;
}

export function isSupplierFormValid(values: SupplierFormValues) {
  return Object.keys(validateSupplierForm(values)).length === 0;
}

export function buildAddressLine(values: SupplierFormValues) {
  const parts = [
    values.address.trim(),
    [values.city.trim(), values.state.trim(), values.pin_code.trim()].filter(Boolean).join(', '),
  ].filter(Boolean);
  return parts.join('\n');
}
