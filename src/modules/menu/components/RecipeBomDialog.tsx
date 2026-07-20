import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Dialog, TextField } from '@mui/material';
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { resolveCatalogItemType } from '@/modules/menu/lib/fetchCatalog';

export type BomProduct = {
  id: string;
  name: string;
  code?: string;
  unit?: string;
  item_type?: string | null;
  purchase_price?: number | null;
  selling_price?: number | null;
};

export type BomIngredient = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  wastePercent: number;
  notes: string;
};

export type BomRecipeMeta = {
  recipeName: string;
  recipeCode: string;
  yieldLabel: string;
  prepMinutes: number | '';
  status: 'active' | 'inactive';
};

export type BomSavePayload = {
  product: BomProduct;
  meta: BomRecipeMeta;
  ingredients: BomIngredient[];
  asDraft: boolean;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  products: BomProduct[];
  initialProduct: BomProduct | null;
  initialIngredients: BomIngredient[];
  initialMeta?: Partial<BomRecipeMeta>;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: BomSavePayload) => Promise<void> | void;
};

function toNumber(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function lineEffectiveQty(ing: BomIngredient) {
  return ing.quantity * (1 + Math.max(0, ing.wastePercent) / 100);
}

function lineCost(ing: BomIngredient) {
  return lineEffectiveQty(ing) * ing.unitCost;
}

function bomTotal(ingredients: BomIngredient[]) {
  return ingredients.reduce((sum, ing) => sum + lineCost(ing), 0);
}

const fieldClass =
  'h-10 w-full rounded-xl border-0 bg-slate-100 px-3 text-sm font-medium text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30';

const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400';

export function RecipeBomDialog({
  open,
  mode,
  products,
  initialProduct,
  initialIngredients,
  initialMeta,
  saving,
  onClose,
  onSave,
}: Props) {
  const [product, setProduct] = useState<BomProduct | null>(null);
  const [meta, setMeta] = useState<BomRecipeMeta>({
    recipeName: '',
    recipeCode: '',
    yieldLabel: '1 Plate',
    prepMinutes: '',
    status: 'active',
  });
  const [ingredients, setIngredients] = useState<BomIngredient[]>([]);
  const [pick, setPick] = useState<BomProduct | null>(null);
  const [qty, setQty] = useState<number | ''>('');
  const [waste, setWaste] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProduct(initialProduct);
    setIngredients(initialIngredients.map((i) => ({ ...i })));
    setMeta({
      recipeName: initialMeta?.recipeName || initialProduct?.name || '',
      recipeCode: initialMeta?.recipeCode || initialProduct?.code || '',
      yieldLabel: initialMeta?.yieldLabel || '1 Plate',
      prepMinutes: initialMeta?.prepMinutes ?? '',
      status: initialMeta?.status || 'active',
    });
    setPick(null);
    setQty('');
    setWaste(0);
    setNotes('');
    setEditingId(null);
    setShowErrors(false);
    setAddError(null);
  }, [open, initialProduct, initialIngredients, initialMeta]);

  useEffect(() => {
    if (!product) return;
    setMeta((m) => ({
      ...m,
      recipeName: m.recipeName || product.name,
      recipeCode: m.recipeCode || product.code || '',
    }));
  }, [product?.id]);

  const finishedOptions = useMemo(
    () =>
      products.filter(
        (p) => resolveCatalogItemType(p) === 'ready_product' || toNumber(p.selling_price) > 0
      ),
    [products]
  );

  const rawOptions = useMemo(() => {
    const base = products.filter(
      (p) => resolveCatalogItemType(p) === 'raw_material' || toNumber(p.selling_price) <= 0
    );
    const list = (base.length > 0 ? base : products).filter((p) => p.id !== product?.id);
    return list;
  }, [products, product?.id]);

  const sellingPrice = toNumber(product?.selling_price);
  const totalCost = bomTotal(ingredients);
  const grossProfit = sellingPrice > 0 ? sellingPrice - totalCost : null;
  const foodCostPct = sellingPrice > 0 ? (totalCost / sellingPrice) * 100 : null;
  const marginPct = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : null;

  const validations = useMemo(() => {
    const errors: string[] = [];
    if (!product) errors.push('Select a finished product');
    if (ingredients.length === 0) errors.push('Add at least one ingredient');
    if (ingredients.some((i) => !(i.quantity > 0))) errors.push('All quantities must be greater than 0');
    return errors;
  }, [product, ingredients]);

  const canSave = validations.length === 0;

  const resetAddRow = () => {
    setPick(null);
    setQty('');
    setWaste(0);
    setNotes('');
    setEditingId(null);
    setAddError(null);
  };

  const handleAddOrUpdate = () => {
    if (!pick) {
      setAddError('Choose an ingredient');
      return;
    }
    const quantity = toNumber(qty);
    if (!(quantity > 0)) {
      setAddError('Enter a valid quantity greater than 0');
      return;
    }
    const duplicate = ingredients.some(
      (i) => i.productId === pick.id && i.productId !== editingId
    );
    if (duplicate) {
      setAddError('This ingredient is already in the BOM');
      return;
    }

    const next: BomIngredient = {
      productId: pick.id,
      name: pick.name,
      unit: pick.unit || 'Unit',
      quantity,
      unitCost: toNumber(pick.purchase_price),
      wastePercent: Math.max(0, toNumber(waste)),
      notes: notes.trim(),
    };

    if (editingId) {
      setIngredients((rows) =>
        rows.map((row) => (row.productId === editingId ? next : row))
      );
    } else {
      setIngredients((rows) => [...rows, next]);
    }
    resetAddRow();
  };

  const startEdit = (ing: BomIngredient) => {
    const match = products.find((p) => p.id === ing.productId) || null;
    setPick(match);
    setQty(ing.quantity);
    setWaste(ing.wastePercent);
    setNotes(ing.notes || '');
    setEditingId(ing.productId);
    setAddError(null);
  };

  const updateInline = (productId: string, patch: Partial<BomIngredient>) => {
    setIngredients((rows) =>
      rows.map((row) => (row.productId === productId ? { ...row, ...patch } : row))
    );
  };

  const submit = async (asDraft: boolean) => {
    if (!asDraft) {
      setShowErrors(true);
      if (!canSave || !product) return;
    } else if (!product) {
      setShowErrors(true);
      return;
    }
    await onSave({
      product: product!,
      meta,
      ingredients,
      asDraft,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: 'min(1100px, calc(100vw - 24px))',
          maxWidth: 1100,
          height: 'min(900px, 92vh)',
          maxHeight: '92vh',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3 sm:py-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            {mode === 'edit' ? 'Edit Recipe (BOM)' : 'Create Recipe (BOM)'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Build a bill of materials and watch food cost update live.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50/80 p-4 sm:p-5">
          {/* Section 1 */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-xs font-black text-[#FF6A00]">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-900">Recipe information</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Finished product</label>
                <Autocomplete
                  options={finishedOptions.length > 0 ? finishedOptions : products}
                  getOptionLabel={(o) => `${o.name}${o.code ? ` · ${o.code}` : ''}`}
                  value={product}
                  onChange={(_e, v) => setProduct(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search menu item…"
                      size="small"
                      error={showErrors && !product}
                      helperText={showErrors && !product ? 'Required' : undefined}
                    />
                  )}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="bom-name">
                  Recipe name
                </label>
                <Input
                  id="bom-name"
                  className={fieldClass}
                  value={meta.recipeName}
                  onChange={(e) => setMeta((m) => ({ ...m, recipeName: e.target.value }))}
                  placeholder="Auto-filled from product"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="bom-code">
                  Recipe code
                </label>
                <Input
                  id="bom-code"
                  className={fieldClass}
                  value={meta.recipeCode}
                  onChange={(e) => setMeta((m) => ({ ...m, recipeCode: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="bom-yield">
                  Yield
                </label>
                <Input
                  id="bom-yield"
                  className={fieldClass}
                  value={meta.yieldLabel}
                  onChange={(e) => setMeta((m) => ({ ...m, yieldLabel: e.target.value }))}
                  placeholder="1 Plate / 1 Pizza"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="bom-prep">
                  Prep time (min)
                </label>
                <Input
                  id="bom-prep"
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={meta.prepMinutes}
                  onChange={(e) =>
                    setMeta((m) => ({
                      ...m,
                      prepMinutes: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g. 12"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="bom-status">
                  Status
                </label>
                <select
                  id="bom-status"
                  className={fieldClass}
                  value={meta.status}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, status: e.target.value as 'active' | 'inactive' }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-xs font-black text-[#FF6A00]">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-900">Add ingredients</h3>
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_90px_90px_minmax(0,1fr)_auto]">
              <div>
                <label className={labelClass}>Ingredient</label>
                <Autocomplete
                  options={rawOptions}
                  getOptionLabel={(o) => `${o.name}${o.unit ? ` (${o.unit})` : ''}`}
                  value={pick}
                  onChange={(_e, v) => {
                    setPick(v);
                    setAddError(null);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Search raw material…" size="small" />
                  )}
                />
              </div>
              <div>
                <label className={labelClass}>Qty</label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className={fieldClass}
                  value={qty}
                  onChange={(e) => {
                    setQty(e.target.value === '' ? '' : Number(e.target.value));
                    setAddError(null);
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Unit</label>
                <Input className={fieldClass} value={pick?.unit || '—'} readOnly disabled />
              </div>
              <div>
                <label className={labelClass}>Waste %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className={fieldClass}
                  value={waste}
                  onChange={(e) => setWaste(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="h-10 w-full rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e85f00] lg:w-auto"
                  onClick={handleAddOrUpdate}
                >
                  <Plus className="h-4 w-4" />
                  {editingId ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>

            <div className="mt-2">
              <label className={labelClass}>Notes (optional)</label>
              <Input
                className={fieldClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Prep notes, brand preference…"
              />
            </div>

            {addError ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {addError}
              </p>
            ) : null}
          </section>

          {/* Section 3 */}
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-xs font-black text-[#FF6A00]">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">BOM table</h3>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {ingredients.length} line{ingredients.length === 1 ? '' : 's'}
              </span>
            </div>

            {ingredients.length === 0 ? (
              <div
                className={cn(
                  'rounded-xl border border-dashed px-4 py-8 text-center text-sm',
                  showErrors ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                )}
              >
                No ingredients yet. Search and add raw materials above.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5">Ingredient</th>
                      <th className="px-3 py-2.5 w-24">Qty</th>
                      <th className="px-3 py-2.5">Unit</th>
                      <th className="px-3 py-2.5 text-right">Cost/unit</th>
                      <th className="px-3 py-2.5 w-20">Waste %</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing) => (
                      <tr key={ing.productId} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-900">{ing.name}</p>
                          {ing.notes ? (
                            <p className="text-[11px] text-slate-400">{ing.notes}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            className="h-9 rounded-lg border-0 bg-slate-100 px-2 text-sm tabular-nums"
                            value={ing.quantity}
                            onChange={(e) =>
                              updateInline(ing.productId, {
                                quantity: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            aria-label={`Quantity for ${ing.name}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-600">{ing.unit}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {formatCurrency(ing.unitCost)}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="h-9 rounded-lg border-0 bg-slate-100 px-2 text-sm tabular-nums"
                            value={ing.wastePercent}
                            onChange={(e) =>
                              updateInline(ing.productId, {
                                wastePercent: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            aria-label={`Waste % for ${ing.name}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900">
                          {formatCurrency(lineCost(ing))}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label={`Edit ${ing.name}`}
                              onClick={() => startEdit(ing)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              aria-label={`Remove ${ing.name}`}
                              onClick={() =>
                                setIngredients((rows) =>
                                  rows.filter((r) => r.productId !== ing.productId)
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {showErrors && validations.length > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <p className="font-bold">Fix before saving</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs font-medium">
                {validations.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Section 4 — sticky summary */}
        <aside className="max-h-[40%] shrink-0 overflow-y-auto border-t border-slate-100 bg-white p-4 lg:max-h-none lg:w-[280px] lg:shrink-0 lg:border-l lg:border-t-0 lg:p-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-[#FF6A00]" />
              <h3 className="text-sm font-bold text-slate-900">Recipe summary</h3>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <SummaryRow label="Ingredients" value={String(ingredients.length)} />
              <SummaryRow label="Total recipe cost" value={formatCurrency(totalCost)} emphasize />
              <SummaryRow
                label="Selling price"
                value={sellingPrice > 0 ? formatCurrency(sellingPrice) : '—'}
              />
              <SummaryRow
                label="Gross profit"
                value={grossProfit === null ? '—' : formatCurrency(grossProfit)}
                tone={grossProfit === null ? undefined : grossProfit >= 0 ? 'good' : 'bad'}
              />
              <SummaryRow
                label="Food cost %"
                value={foodCostPct === null ? '—' : `${foodCostPct.toFixed(1)}%`}
                tone={
                  foodCostPct === null
                    ? undefined
                    : foodCostPct <= 35
                      ? 'good'
                      : foodCostPct <= 45
                        ? 'warn'
                        : 'bad'
                }
              />
              <SummaryRow
                label="Margin %"
                value={marginPct === null ? '—' : `${marginPct.toFixed(1)}%`}
                tone={
                  marginPct === null
                    ? undefined
                    : marginPct >= 55
                      ? 'good'
                      : marginPct >= 40
                        ? 'warn'
                        : 'bad'
                }
              />
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <p className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Waste % increases effective consumption for food cost.
              </p>
              <p className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Target food cost for cafés is typically 28–35%.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl font-semibold"
            disabled={saving || !product}
            onClick={() => void submit(true)}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e85f00] disabled:opacity-40"
            disabled={saving}
            onClick={() => void submit(false)}
          >
            {saving ? 'Saving…' : 'Save Recipe'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function SummaryRow({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: 'good' | 'warn' | 'bad';
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span
        className={cn(
          'text-sm font-bold tabular-nums text-slate-900',
          emphasize && 'text-base text-[#FF6A00]',
          tone === 'good' && 'text-emerald-600',
          tone === 'warn' && 'text-amber-600',
          tone === 'bad' && 'text-rose-600'
        )}
      >
        {value}
      </span>
    </div>
  );
}
