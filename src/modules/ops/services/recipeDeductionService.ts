import { supabase } from '@/lib/supabase';
import { applyInventoryDelta, getStockLevels } from './inventoryLedgerService';
import type { DeductionLine, SaleLineInput } from '../types';
import { loadOpsSettings } from './managerPinService';
import { loadAvailabilityPolicy } from '@/modules/availability';

type RecipeIngredientRow = {
  raw_material_id: string;
  quantity_consumed: number;
  waste_percent?: number | null;
  raw_material?: { name?: string } | null;
};

type RecipeRow = {
  id: string;
  product_id: string;
  product?: { name?: string } | null;
  recipe_ingredients?: RecipeIngredientRow[];
};

/**
 * Expand sold finished goods into raw-material consumption via recipes.
 * Supports one level of nesting: if an ingredient itself has a recipe, expand it.
 */
export async function expandRecipeDeductions(
  lines: SaleLineInput[],
  depth = 0
): Promise<DeductionLine[]> {
  if (!lines.length || depth > 3) return [];

  const productIds = [...new Set(lines.map((l) => l.productId).filter(Boolean))];
  if (!productIds.length) return [];

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select(
      `
      id,
      product_id,
      product:products!recipes_product_id_fkey(name),
      recipe_ingredients (
        raw_material_id,
        quantity_consumed,
        waste_percent,
        raw_material:products!recipe_ingredients_raw_material_id_fkey(name)
      )
    `
    )
    .in('product_id', productIds);

  if (error) {
    // Fallback without FK embeds
    const { data: plain } = await supabase
      .from('recipes')
      .select('id, product_id, recipe_ingredients(raw_material_id, quantity_consumed, waste_percent)')
      .in('product_id', productIds);
    return expandFromRecipes(lines, (plain || []) as RecipeRow[], depth);
  }

  return expandFromRecipes(lines, (recipes || []) as RecipeRow[], depth);
}

async function expandFromRecipes(
  lines: SaleLineInput[],
  recipes: RecipeRow[],
  depth: number
): Promise<DeductionLine[]> {
  const byProduct = new Map(recipes.map((r) => [r.product_id, r]));
  const direct: DeductionLine[] = [];
  const nestedParents: SaleLineInput[] = [];

  for (const line of lines) {
    const recipe = byProduct.get(line.productId);
    if (!recipe?.recipe_ingredients?.length) {
      // No recipe — treat finished good as trackable stock itself
      direct.push({
        productId: line.productId,
        productName: line.name,
        quantity: line.quantity,
        fromProductId: line.productId,
        fromProductName: line.name,
      });
      continue;
    }

    for (const ing of recipe.recipe_ingredients) {
      const waste = Number(ing.waste_percent || 0);
      const qty =
        Number(ing.quantity_consumed || 0) * line.quantity * (1 + (Number.isFinite(waste) ? waste : 0) / 100);
      if (!(qty > 0) || !ing.raw_material_id) continue;
      direct.push({
        productId: ing.raw_material_id,
        productName: ing.raw_material?.name || 'Ingredient',
        quantity: qty,
        fromProductId: line.productId,
        fromProductName: line.name,
      });
      nestedParents.push({
        productId: ing.raw_material_id,
        name: ing.raw_material?.name || 'Ingredient',
        quantity: qty,
        unitPrice: 0,
      });
    }
  }

  // Nested recipes: expand ingredients that are themselves recipes (skip leaf re-count)
  if (depth < 2 && nestedParents.length) {
    const nestedIds = [...new Set(nestedParents.map((p) => p.productId))];
    const { data: nestedRecipes } = await supabase
      .from('recipes')
      .select('product_id')
      .in('product_id', nestedIds);
    const nestedSet = new Set((nestedRecipes || []).map((r: { product_id: string }) => r.product_id));
    const toExpand = nestedParents.filter((p) => nestedSet.has(p.productId));
    if (toExpand.length) {
      // Remove direct lines that will be replaced by nested expansion
      const expandIds = new Set(toExpand.map((t) => t.productId));
      const kept = direct.filter((d) => !expandIds.has(d.productId));
      const nestedLines = await expandRecipeDeductions(toExpand, depth + 1);
      return consolidate(kept.concat(nestedLines));
    }
  }

  return consolidate(direct);
}

function consolidate(lines: DeductionLine[]): DeductionLine[] {
  const map = new Map<string, DeductionLine>();
  for (const line of lines) {
    const existing = map.get(line.productId);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      map.set(line.productId, { ...line });
    }
  }
  return [...map.values()];
}

export type DeductionCheckResult =
  | { ok: true; deductions: DeductionLine[] }
  | { ok: false; message: string; shortages: Array<{ productId: string; name: string; need: number; have: number }> };

export async function checkInventoryForSale(params: {
  outletId: string;
  lines: SaleLineInput[];
}): Promise<DeductionCheckResult> {
  const settings = await loadOpsSettings(params.outletId);
  if (!settings.inventoryTrackingEnabled) {
    return { ok: true, deductions: [] };
  }

  const deductions = await expandRecipeDeductions(params.lines);
  if (!deductions.length) return { ok: true, deductions: [] };

  const policy = await loadAvailabilityPolicy(params.outletId);
  if (
    settings.allowNegativeStock ||
    policy.inventoryEnforcement === 'track' ||
    policy.inventoryEnforcement === 'warn'
  ) {
    return { ok: true, deductions };
  }

  const levels = await getStockLevels(
    params.outletId,
    deductions.map((d) => d.productId)
  );

  const shortages: DeductionCheckResult extends { ok: false; shortages: infer S } ? S : never = [];
  for (const d of deductions) {
    const have = levels[d.productId] ?? 0;
    if (have + 1e-6 < d.quantity) {
      shortages.push({
        productId: d.productId,
        name: d.productName,
        need: d.quantity,
        have,
      });
    }
  }

  if (shortages.length) {
    const msg = shortages
      .slice(0, 3)
      .map((s) => `${s.name}: need ${s.need.toFixed(2)}, have ${s.have.toFixed(2)}`)
      .join('; ');
    return {
      ok: false,
      message: `Insufficient inventory. ${msg}`,
      shortages,
    };
  }

  return { ok: true, deductions };
}

export async function deductInventoryForSale(params: {
  outletId: string;
  orderId: string;
  lines: SaleLineInput[];
  createdBy?: string | null;
  orderSource?: string;
}): Promise<{ deducted: boolean; lines: DeductionLine[] }> {
  const check = await checkInventoryForSale({
    outletId: params.outletId,
    lines: params.lines,
  });

  if (!check.ok) {
    throw new Error(check.message);
  }

  if (!check.deductions.length) {
    return { deducted: false, lines: [] };
  }

  for (const line of check.deductions) {
    await applyInventoryDelta({
      outletId: params.outletId,
      productId: line.productId,
      movementType: 'sale',
      quantityDelta: -line.quantity,
      referenceType: 'pos_order',
      referenceId: params.orderId,
      notes: `Sale of ${line.fromProductName}${params.orderSource ? ` (${params.orderSource})` : ''}`,
      createdBy: params.createdBy,
    });
  }

  return { deducted: true, lines: check.deductions };
}

export async function restoreInventoryForRefund(params: {
  outletId: string;
  orderId: string;
  refundId: string;
  lines: SaleLineInput[];
  createdBy?: string | null;
}): Promise<void> {
  const settings = await loadOpsSettings(params.outletId);
  if (!settings.inventoryTrackingEnabled) return;

  const deductions = await expandRecipeDeductions(params.lines);
  for (const line of deductions) {
    await applyInventoryDelta({
      outletId: params.outletId,
      productId: line.productId,
      movementType: 'refund',
      quantityDelta: line.quantity,
      referenceType: 'refund',
      referenceId: params.refundId,
      notes: `Refund restore for order ${params.orderId}`,
      createdBy: params.createdBy,
    });
  }
}
