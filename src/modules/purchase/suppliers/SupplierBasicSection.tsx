import type { RefObject } from 'react';
import { FieldError, FieldLabel, SectionCard, supplierFieldClass } from './formStyles';
import { SUPPLIER_CATEGORIES, type SupplierFormErrors, type SupplierFormValues } from './types';
import { cn } from '@/lib/utils';

type Props = {
  values: SupplierFormValues;
  errors: SupplierFormErrors;
  disabled?: boolean;
  categoryQuery: string;
  onCategoryQueryChange: (q: string) => void;
  onChange: (next: Partial<SupplierFormValues>) => void;
  nameInputRef?: RefObject<HTMLInputElement | null>;
};

export function SupplierBasicSection({
  values,
  errors,
  disabled,
  categoryQuery,
  onCategoryQueryChange,
  onChange,
  nameInputRef,
}: Props) {
  const filtered = SUPPLIER_CATEGORIES.filter((c) =>
    c.toLowerCase().includes(categoryQuery.trim().toLowerCase())
  );
  const showCustom =
    categoryQuery.trim() &&
    !SUPPLIER_CATEGORIES.some((c) => c.toLowerCase() === categoryQuery.trim().toLowerCase());

  return (
    <SectionCard title="Basic Information" description="Identify the vendor and how they appear in purchasing.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="supplier-name" required>
            Company Name
          </FieldLabel>
          <input
            ref={nameInputRef}
            id="supplier-name"
            type="text"
            maxLength={100}
            disabled={disabled}
            autoComplete="organization"
            className={cn(supplierFieldClass, errors.name && 'ring-2 ring-red-300')}
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'supplier-name-error' : undefined}
          />
          <FieldError id="supplier-name-error" message={errors.name} />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel htmlFor="supplier-category" required>
            Supplier Category
          </FieldLabel>
          <input
            id="supplier-category"
            type="text"
            list="supplier-category-options"
            disabled={disabled}
            placeholder="Search or type a category…"
            className={cn(supplierFieldClass, errors.category && 'ring-2 ring-red-300')}
            value={values.category || categoryQuery}
            onChange={(e) => {
              const v = e.target.value;
              onCategoryQueryChange(v);
              onChange({ category: v });
            }}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? 'supplier-category-error' : undefined}
          />
          <datalist id="supplier-category-options">
            {filtered.map((c) => (
              <option key={c} value={c} />
            ))}
            {showCustom ? <option value={categoryQuery.trim()} /> : null}
          </datalist>
          <FieldError id="supplier-category-error" message={errors.category} />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100 sm:col-span-1">
          <div>
            <p className="text-sm font-semibold text-slate-800">Preferred Supplier</p>
            <p className="text-xs text-slate-500">Prioritize in purchase suggestions</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={values.preferred_supplier}
            disabled={disabled}
            onClick={() => onChange({ preferred_supplier: !values.preferred_supplier })}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40',
              values.preferred_supplier ? 'bg-[#FF6A00]' : 'bg-slate-200'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                values.preferred_supplier && 'translate-x-5'
              )}
            />
          </button>
        </div>

        <div>
          <FieldLabel>Status</FieldLabel>
          <div className="flex h-11 gap-2" role="group" aria-label="Supplier status">
            {(['active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ status })}
                className={cn(
                  'flex-1 rounded-xl text-sm font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40',
                  values.status === status
                    ? status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-slate-200 text-slate-700'
                    : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
