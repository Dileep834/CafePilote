import { FieldError, FieldLabel, SectionCard, supplierFieldClass, supplierTextareaClass } from './formStyles';
import type { SupplierFormErrors, SupplierFormValues } from './types';
import { cn } from '@/lib/utils';

type Props = {
  values: SupplierFormValues;
  errors: SupplierFormErrors;
  disabled?: boolean;
  onChange: (next: Partial<SupplierFormValues>) => void;
};

export function SupplierBusinessSection({ values, errors, disabled, onChange }: Props) {
  return (
    <SectionCard title="Business Information" description="Location and tax details for invoices.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="supplier-gst">GST Number (Optional)</FieldLabel>
          <input
            id="supplier-gst"
            type="text"
            disabled={disabled}
            placeholder="22AAAAA0000A1Z5"
            className={cn(supplierFieldClass, 'uppercase', errors.gst_number && 'ring-2 ring-red-300')}
            value={values.gst_number}
            onChange={(e) => onChange({ gst_number: e.target.value.toUpperCase() })}
            aria-invalid={Boolean(errors.gst_number)}
            aria-describedby={errors.gst_number ? 'supplier-gst-error' : undefined}
          />
          <FieldError id="supplier-gst-error" message={errors.gst_number} />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel htmlFor="supplier-address">Address</FieldLabel>
          <textarea
            id="supplier-address"
            disabled={disabled}
            rows={2}
            placeholder="Street, landmark, area…"
            className={supplierTextareaClass}
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="supplier-city">City</FieldLabel>
          <input
            id="supplier-city"
            type="text"
            disabled={disabled}
            className={supplierFieldClass}
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="supplier-state">State</FieldLabel>
          <input
            id="supplier-state"
            type="text"
            disabled={disabled}
            className={supplierFieldClass}
            value={values.state}
            onChange={(e) => onChange({ state: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="supplier-pin">PIN Code</FieldLabel>
          <input
            id="supplier-pin"
            type="text"
            inputMode="numeric"
            maxLength={6}
            disabled={disabled}
            className={cn(supplierFieldClass, errors.pin_code && 'ring-2 ring-red-300')}
            value={values.pin_code}
            onChange={(e) => onChange({ pin_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            aria-invalid={Boolean(errors.pin_code)}
            aria-describedby={errors.pin_code ? 'supplier-pin-error' : undefined}
          />
          <FieldError id="supplier-pin-error" message={errors.pin_code} />
        </div>
      </div>
    </SectionCard>
  );
}
