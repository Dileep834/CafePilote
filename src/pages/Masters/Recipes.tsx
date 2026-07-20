import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChefHat,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { resolveCatalogItemType } from '@/modules/menu/lib/fetchCatalog';
import { isMissingSchemaField } from '@/modules/inventory/lib/fetchInventory';
import {
  RecipeBomDialog,
  type BomIngredient,
  type BomProduct,
  type BomRecipeMeta,
  type BomSavePayload,
} from '@/modules/menu/components/RecipeBomDialog';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { isSuperAdmin } from '@/lib/access';

type RecipeIngredient = BomIngredient;

type RecipeRow = {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  sellingPrice: number;
  ingredients: RecipeIngredient[];
  meta: BomRecipeMeta;
  isDraft?: boolean;
  updatedAt?: string | null;
};

function toNumber(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function lineCost(ing: RecipeIngredient) {
  return ing.quantity * (1 + Math.max(0, ing.wastePercent) / 100) * ing.unitCost;
}

function recipeCost(ingredients: RecipeIngredient[]) {
  return ingredients.reduce((sum, ing) => sum + lineCost(ing), 0);
}

function formatShortDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

const Recipes: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [products, setProducts] = useState<BomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'thin'>('all');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<BomProduct | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [recipeMeta, setRecipeMeta] = useState<Partial<BomRecipeMeta>>({});
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);

  const companyId = getScopedCompanyId(user);

  useEffect(() => {
    void fetchProducts();
    void loadRecipes();
  }, [user?.companyId, companyId]);

  useEffect(() => {
    const productId = searchParams.get('productId');
    if (!productId || products.length === 0 || loading) return;

    const existing = recipes.find((r) => r.productId === productId);
    if (existing) {
      openEditor(existing);
    } else {
      const prod = products.find((p) => p.id === productId);
      if (prod) {
        setCurrentRecipeId(null);
        setSelectedProduct(prod);
        setIngredients([]);
        setRecipeMeta({ recipeName: prod.name, recipeCode: prod.code || '' });
        setOpen(true);
      }
    }

    const next = new URLSearchParams(searchParams);
    next.delete('productId');
    setSearchParams(next, { replace: true });
  }, [products, recipes, loading, searchParams, setSearchParams]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('products')
        .select('id, name, code, unit, item_type, purchase_price, selling_price, is_active')
        .order('name');
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      setProducts((data || []) as BomProduct[]);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const selectFull = `
          id,
          product_id,
          updated_at,
          name,
          code,
          yield_label,
          prep_minutes,
          status,
          is_draft,
          product:products!recipes_product_id_fkey(name, code, selling_price, purchase_price),
          recipe_ingredients (
            id,
            raw_material_id,
            quantity_consumed,
            waste_percent,
            notes,
            raw_material:products!recipe_ingredients_raw_material_id_fkey(name, unit, purchase_price)
          )
        `;
      const selectBase = `
          id,
          product_id,
          updated_at,
          product:products!recipes_product_id_fkey(name, code, selling_price, purchase_price),
          recipe_ingredients (
            id,
            raw_material_id,
            quantity_consumed,
            raw_material:products!recipe_ingredients_raw_material_id_fkey(name, unit, purchase_price)
          )
        `;

      let query = supabase.from('recipes').select(selectFull);
      if (!isSuperAdmin(user) && user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }

      let { data, error } = await query;
      if (error && isMissingSchemaField(error)) {
        let fallback = supabase.from('recipes').select(selectBase);
        if (!isSuperAdmin(user) && user?.companyId) {
          fallback = fallback.eq('company_id', user.companyId);
        }
        const fb = await fallback;
        if (fb.error) throw fb.error;
        data = fb.data as typeof data;
      } else if (error) {
        throw error;
      }

      const formatted: RecipeRow[] = (data || []).map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        productName: r.name || r.product?.name || 'Unknown product',
        productCode: r.code || r.product?.code || '',
        sellingPrice: toNumber(r.product?.selling_price),
        updatedAt: r.updated_at || null,
        isDraft: Boolean(r.is_draft),
        meta: {
          recipeName: r.name || r.product?.name || '',
          recipeCode: r.code || r.product?.code || '',
          yieldLabel: r.yield_label || '1 Plate',
          prepMinutes: r.prep_minutes ?? '',
          status: r.status === 'inactive' ? 'inactive' : 'active',
        },
        ingredients: (r.recipe_ingredients || []).map((ing: any) => ({
          productId: ing.raw_material_id,
          name: ing.raw_material?.name || 'Ingredient',
          unit: ing.raw_material?.unit || 'Unit',
          quantity: toNumber(ing.quantity_consumed),
          unitCost: toNumber(ing.raw_material?.purchase_price),
          wastePercent: toNumber(ing.waste_percent),
          notes: String(ing.notes || ''),
        })),
      }));

      setRecipes(formatted);
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const finishedProducts = useMemo(
    () =>
      products.filter((p) => {
        const type = resolveCatalogItemType(p);
        return type === 'ready_product' || toNumber(p.selling_price) > 0;
      }),
    [products]
  );

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipes.filter((r) => {
      if (q) {
        const hay = `${r.productName} ${r.productCode} ${r.ingredients.map((i) => i.name).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const count = r.ingredients.length;
      if (statusFilter === 'complete' && count < 2) return false;
      if (statusFilter === 'thin' && count >= 2) return false;
      return true;
    });
  }, [recipes, search, statusFilter]);

  const kpis = useMemo(() => {
    const withRecipe = new Set(recipes.map((r) => r.productId));
    const missingBom = finishedProducts.filter((p) => !withRecipe.has(p.id)).length;
    const avgIngredients =
      recipes.length > 0
        ? Math.round(
            (recipes.reduce((s, r) => s + r.ingredients.length, 0) / recipes.length) * 10
          ) / 10
        : 0;
    const totalCost = recipes.reduce((s, r) => s + recipeCost(r.ingredients), 0);
    return {
      recipes: recipes.length,
      finished: finishedProducts.length,
      missingBom,
      avgIngredients,
      totalCost,
    };
  }, [recipes, finishedProducts]);

  const openEditor = (recipe?: RecipeRow) => {
    if (recipe) {
      setCurrentRecipeId(recipe.id);
      setSelectedProduct(products.find((p) => p.id === recipe.productId) || null);
      setIngredients(recipe.ingredients || []);
      setRecipeMeta(recipe.meta);
    } else {
      setCurrentRecipeId(null);
      setSelectedProduct(null);
      setIngredients([]);
      setRecipeMeta({ yieldLabel: '1 Plate', status: 'active' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentRecipeId(null);
    setSelectedProduct(null);
    setIngredients([]);
    setRecipeMeta({});
  };

  const persistRecipe = async (payload: BomSavePayload) => {
    if (!user?.companyId) {
      window.alert('Company context missing. Re-login and try again.');
      return;
    }
    if (!payload.asDraft && payload.ingredients.length === 0) return;

    setSaving(true);
    try {
      let recipeId = currentRecipeId;
      const coreRow: Record<string, unknown> = {
        product_id: payload.product.id,
        company_id: user.companyId,
        updated_at: new Date().toISOString(),
      };
      const extendedRow = {
        ...coreRow,
        name: payload.meta.recipeName || payload.product.name,
        code: payload.meta.recipeCode || payload.product.code || null,
        yield_label: payload.meta.yieldLabel || null,
        prep_minutes:
          payload.meta.prepMinutes === '' ? null : Number(payload.meta.prepMinutes),
        status: payload.asDraft ? 'inactive' : payload.meta.status,
        is_active: !payload.asDraft && payload.meta.status === 'active',
        is_draft: payload.asDraft,
      };

      if (!recipeId) {
        let insert = await supabase.from('recipes').insert([extendedRow]).select().single();
        if (insert.error && isMissingSchemaField(insert.error)) {
          insert = await supabase
            .from('recipes')
            .insert([{ product_id: payload.product.id, company_id: user.companyId }])
            .select()
            .single();
        }
        if (insert.error) {
          if (insert.error.code === '23505') {
            window.alert('A recipe for this product already exists.');
            return;
          }
          throw insert.error;
        }
        recipeId = insert.data.id;
      } else {
        let upd = await supabase.from('recipes').update(extendedRow).eq('id', recipeId);
        if (upd.error && isMissingSchemaField(upd.error)) {
          upd = await supabase
            .from('recipes')
            .update({
              product_id: payload.product.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', recipeId);
        }
        if (upd.error) throw upd.error;

        const { error: delErr } = await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', recipeId);
        if (delErr) throw delErr;
      }

      if (payload.ingredients.length > 0) {
        const withMeta = payload.ingredients.map((ing) => ({
          recipe_id: recipeId,
          raw_material_id: ing.productId,
          quantity_consumed: ing.quantity,
          waste_percent: ing.wastePercent || 0,
          notes: ing.notes || null,
        }));
        let ingInsert = await supabase.from('recipe_ingredients').insert(withMeta);
        if (ingInsert.error && isMissingSchemaField(ingInsert.error)) {
          const coreOnly = payload.ingredients.map((ing) => ({
            recipe_id: recipeId,
            raw_material_id: ing.productId,
            quantity_consumed: ing.quantity,
          }));
          ingInsert = await supabase.from('recipe_ingredients').insert(coreOnly);
        }
        if (ingInsert.error) throw ingInsert.error;
      }

      await loadRecipes();
      handleClose();
    } catch (err: any) {
      console.error('Error saving recipe:', err);
      window.alert('Failed to save recipe: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this recipe? Inventory auto-deduction will stop for this item.')) {
      return;
    }
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
      await loadRecipes();
    } catch (err: any) {
      console.error('Error deleting recipe:', err);
      window.alert('Failed to delete recipe: ' + err.message);
    }
  };

  const selectClass =
    'h-10 rounded-xl border-0 bg-slate-100 px-3 text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11';

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Recipe Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bill of materials — link finished menu items to the raw materials they consume.
          </p>
        </div>
        <Button
          className="h-11 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e85f00]"
          onClick={() => openEditor()}
        >
          <Plus className="h-4 w-4" />
          Create Recipe
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InventoryCard
          label="Recipes"
          value={String(kpis.recipes)}
          subtitle="BOMs configured"
          icon={BookOpen}
          tone="slate"
          className="min-h-[120px] sm:min-h-[120px]"
        />
        <InventoryCard
          label="Finished goods"
          value={String(kpis.finished)}
          subtitle="Sellable products"
          icon={ChefHat}
          tone="blue"
          className="min-h-[120px] sm:min-h-[120px]"
        />
        <InventoryCard
          label="Missing BOM"
          value={String(kpis.missingBom)}
          subtitle="Need a recipe"
          icon={AlertTriangle}
          tone={kpis.missingBom > 0 ? 'amber' : 'emerald'}
          className="min-h-[120px] sm:min-h-[120px]"
        />
        <InventoryCard
          label="Avg ingredients"
          value={String(kpis.avgIngredients)}
          subtitle={`Cost book ${formatCurrency(kpis.totalCost)}`}
          icon={Layers}
          tone="orange"
          className="min-h-[120px] sm:min-h-[120px]"
        />
      </div>

      <div className="sticky top-0 z-20 -mx-1 flex flex-col gap-2 border-b border-slate-100 bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)] sm:mx-0 sm:flex-row sm:items-center sm:rounded-xl sm:border-0 sm:p-4 sm:shadow-sm sm:ring-1 sm:ring-slate-100">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipe, SKU, ingredient…"
            className="h-10 rounded-xl border-0 bg-slate-100 pl-9 pr-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11"
            aria-label="Search recipes"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <select
          aria-label="Recipe completeness"
          className={cn(selectClass, 'sm:w-48')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">All recipes</option>
          <option value="complete">2+ ingredients</option>
          <option value="thin">Thin BOM (1 item)</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
          <BookOpen className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-lg font-black text-slate-900">No recipes yet</p>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Create a bill of materials so POS sales auto-deduct kitchen stock for each finished item.
          </p>
          <Button
            className="mt-4 h-11 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e85f00]"
            onClick={() => openEditor()}
          >
            <Plus className="h-4 w-4" />
            Create Recipe
          </Button>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-6 py-12 text-center ring-1 ring-slate-100">
          <p className="font-bold text-slate-800">No matching recipes</p>
          <p className="mt-1 text-sm text-slate-500">Try another search or clear filters.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10 rounded-xl"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
          >
            Reset filters
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50/95">
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Finished product</th>
                    <th className="px-4 py-3">Ingredients</th>
                    <th className="px-4 py-3 text-right">BOM cost</th>
                    <th className="px-4 py-3 text-right">Sell price</th>
                    <th className="px-4 py-3 text-right">Margin</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="w-14 px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipes.map((recipe) => {
                    const cost = recipeCost(recipe.ingredients);
                    const margin = recipe.sellingPrice > 0 ? recipe.sellingPrice - cost : null;
                    return (
                      <tr
                        key={recipe.id}
                        className="h-16 cursor-pointer border-b border-slate-50 transition-colors duration-150 hover:bg-orange-50/40"
                        onClick={() => openEditor(recipe)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00] ring-1 ring-orange-100">
                              <ChefHat className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {recipe.productName}
                                {recipe.isDraft ? (
                                  <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                                    Draft
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-[11px] font-medium text-slate-400">
                                {recipe.productCode || 'No SKU'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-600">
                              {recipe.ingredients.length}
                            </span>
                            <span className="max-w-[220px] truncate text-xs text-slate-500">
                              {recipe.ingredients
                                .slice(0, 3)
                                .map((i) => i.name)
                                .join(', ')}
                              {recipe.ingredients.length > 3 ? '…' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                          {formatCurrency(cost)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {recipe.sellingPrice > 0 ? formatCurrency(recipe.sellingPrice) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {margin === null ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span
                              className={cn(
                                'font-bold tabular-nums',
                                margin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              )}
                            >
                              {formatCurrency(margin)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatShortDate(recipe.updatedAt)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-xl text-slate-500"
                                  aria-label={`Actions for ${recipe.productName}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 rounded-lg"
                                onClick={() => openEditor(recipe)}
                              >
                                <Pencil className="h-4 w-4 text-slate-400" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 rounded-lg text-red-600 focus:bg-red-50"
                                onClick={() => void handleDelete(recipe.id)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {filteredRecipes.map((recipe) => {
              const cost = recipeCost(recipe.ingredients);
              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => openEditor(recipe)}
                  className="flex w-full items-start gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]">
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{recipe.productName}</p>
                    <p className="text-[11px] text-slate-400">{recipe.productCode || 'No SKU'}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5">
                        {recipe.ingredients.length} ingredients
                      </span>
                      <span className="tabular-nums">{formatCurrency(cost)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <RecipeBomDialog
        open={open}
        mode={currentRecipeId ? 'edit' : 'create'}
        products={products}
        initialProduct={selectedProduct}
        initialIngredients={ingredients}
        initialMeta={recipeMeta}
        saving={saving}
        onClose={handleClose}
        onSave={persistRecipe}
      />
    </div>
  );
};

export default Recipes;
