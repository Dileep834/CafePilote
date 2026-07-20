import { FieldLabel, SectionCard, supplierFieldClass } from './formStyles';
import { DELIVERY_TIMES, PAYMENT_TERMS, type SupplierFormValues } from './types';

type Props = {
  values: SupplierFormValues;
  disabled?: boolean;
  onChange: (next: Partial<SupplierFormValues>) => void;
};

export function SupplierPurchaseSection({ values, disabled, onChange }: Props) {
  return (
    <SectionCard title="Purchase Preferences" description="Defaults used when creating purchase orders.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="supplier-payment">Payment Terms</FieldLabel>
          <select
            id="supplier-payment"
            disabled={disabled}
            className={supplierFieldClass}
            value={values.payment_terms}
            onChange={(e) => onChange({ payment_terms: e.target.value })}
          >
            <option value="">Select terms…</option>
            {PAYMENT_TERMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="supplier-delivery">Preferred Delivery Time</FieldLabel>
          <select
            id="supplier-delivery"
            disabled={disabled}
            className={supplierFieldClass}
            value={values.preferred_delivery_time}
            onChange={(e) => onChange({ preferred_delivery_time: e.target.value })}
          >
            <option value="">Select time…</option>
            {DELIVERY_TIMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </SectionCard>
  );
}
