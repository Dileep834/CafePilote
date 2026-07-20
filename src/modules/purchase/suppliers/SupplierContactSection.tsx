import { FieldError, FieldLabel, SectionCard, supplierFieldClass } from './formStyles';
import type { SupplierFormErrors, SupplierFormValues } from './types';
import { formatIndianPhone } from './validation';
import { cn } from '@/lib/utils';

type Props = {
  values: SupplierFormValues;
  errors: SupplierFormErrors;
  disabled?: boolean;
  onChange: (next: Partial<SupplierFormValues>) => void;
};

export function SupplierContactSection({ values, errors, disabled, onChange }: Props) {
  return (
    <SectionCard title="Contact Information" description="How your team reaches this vendor.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="supplier-contact">Contact Person</FieldLabel>
          <input
            id="supplier-contact"
            type="text"
            disabled={disabled}
            autoComplete="name"
            className={supplierFieldClass}
            value={values.contact_name}
            onChange={(e) => onChange({ contact_name: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="supplier-phone" required>
            Phone Number
          </FieldLabel>
          <input
            id="supplier-phone"
            type="tel"
            inputMode="tel"
            disabled={disabled}
            autoComplete="tel"
            placeholder="+91 XXXXX XXXXX"
            className={cn(supplierFieldClass, errors.phone && 'ring-2 ring-red-300')}
            value={values.phone}
            onChange={(e) => onChange({ phone: formatIndianPhone(e.target.value) })}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'supplier-phone-error' : undefined}
          />
          <FieldError id="supplier-phone-error" message={errors.phone} />
        </div>

        <div>
          <FieldLabel htmlFor="supplier-email">Email Address</FieldLabel>
          <input
            id="supplier-email"
            type="email"
            disabled={disabled}
            autoComplete="email"
            placeholder="orders@vendor.com"
            className={cn(supplierFieldClass, errors.email && 'ring-2 ring-red-300')}
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'supplier-email-error' : undefined}
          />
          <FieldError id="supplier-email-error" message={errors.email} />
        </div>

        <div>
          <FieldLabel htmlFor="supplier-website">Website (Optional)</FieldLabel>
          <input
            id="supplier-website"
            type="url"
            disabled={disabled}
            placeholder="www.vendor.com"
            className={cn(supplierFieldClass, errors.website && 'ring-2 ring-red-300')}
            value={values.website}
            onChange={(e) => onChange({ website: e.target.value })}
            aria-invalid={Boolean(errors.website)}
            aria-describedby={errors.website ? 'supplier-website-error' : undefined}
          />
          <FieldError id="supplier-website-error" message={errors.website} />
        </div>
      </div>
    </SectionCard>
  );
}
