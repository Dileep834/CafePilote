import { FieldLabel, SectionCard, supplierTextareaClass } from './formStyles';
import type { SupplierFormValues } from './types';

type Props = {
  values: SupplierFormValues;
  disabled?: boolean;
  onChange: (next: Partial<SupplierFormValues>) => void;
};

export function SupplierNotesSection({ values, disabled, onChange }: Props) {
  return (
    <SectionCard title="Additional Notes" description="Optional context for kitchen and purchasing teams.">
      <FieldLabel htmlFor="supplier-notes">Notes</FieldLabel>
      <textarea
        id="supplier-notes"
        disabled={disabled}
        rows={3}
        placeholder="Special instructions, delivery notes, quality expectations…"
        className={supplierTextareaClass}
        value={values.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    </SectionCard>
  );
}
