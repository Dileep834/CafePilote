import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierBasicSection } from './SupplierBasicSection';
import { SupplierContactSection } from './SupplierContactSection';
import { SupplierBusinessSection } from './SupplierBusinessSection';
import { SupplierPurchaseSection } from './SupplierPurchaseSection';
import { SupplierNotesSection } from './SupplierNotesSection';
import {
  EMPTY_SUPPLIER_FORM,
  type SupplierCreatePayload,
  type SupplierFormErrors,
  type SupplierFormValues,
} from './types';
import { buildAddressLine, isSupplierFormValid, validateSupplierForm } from './validation';

type Props = {
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: SupplierCreatePayload) => Promise<void> | void;
};

export function SupplierForm({ open, saving = false, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<SupplierFormValues>(EMPTY_SUPPLIER_FORM);
  const [touched, setTouched] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setValues(EMPTY_SUPPLIER_FORM);
    setTouched(false);
    setCategoryQuery('');
    const id = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  const errors: SupplierFormErrors = useMemo(
    () => (touched ? validateSupplierForm(values) : {}),
    [touched, values]
  );
  const canSave = isSupplierFormValid(values) && !saving;

  const patch = (next: Partial<SupplierFormValues>) => {
    setValues((prev) => ({ ...prev, ...next }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const nextErrors = validateSupplierForm(values);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: SupplierCreatePayload = {
      name: values.name.trim(),
      category: values.category.trim(),
      contact_name: values.contact_name.trim(),
      phone: values.phone.trim(),
      address: buildAddressLine(values),
      is_active: values.status === 'active',
      email: values.email.trim() || null,
      website: values.website.trim() || null,
      gst_number: values.gst_number.trim() || null,
      city: values.city.trim() || null,
      state: values.state.trim() || null,
      pin_code: values.pin_code.trim() || null,
      payment_terms: values.payment_terms || null,
      preferred_delivery_time: values.preferred_delivery_time || null,
      preferred_supplier: values.preferred_supplier,
      notes: values.notes.trim() || null,
    };

    await onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-supplier-title"
        aria-describedby="add-supplier-subtitle"
        className="flex max-h-[94vh] w-full max-w-[700px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="add-supplier-title" className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Add Supplier
            </h2>
            <p id="add-supplier-subtitle" className="mt-1 text-sm text-slate-500">
              Create a supplier to manage purchases and inventory replenishment.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:space-y-5 sm:px-6 sm:py-5">
            <SupplierBasicSection
              values={values}
              errors={errors}
              disabled={saving}
              categoryQuery={categoryQuery}
              onCategoryQueryChange={setCategoryQuery}
              onChange={patch}
              nameInputRef={nameRef}
            />
            <SupplierContactSection values={values} errors={errors} disabled={saving} onChange={patch} />
            <SupplierBusinessSection values={values} errors={errors} disabled={saving} onChange={patch} />
            <SupplierPurchaseSection values={values} disabled={saving} onChange={patch} />
            <SupplierNotesSection values={values} disabled={saving} onChange={patch} />
            {/* Extensible slot for future sections: Bank Details, Credit Limit, Rating, Mapping, Attachments */}
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:px-6">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              className="h-11 flex-1 rounded-xl border-slate-200"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSave}
              className="h-11 flex-1 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Supplier'
              )}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
