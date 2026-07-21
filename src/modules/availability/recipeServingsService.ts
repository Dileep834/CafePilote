import { supabase } from '@/lib/supabase';
import { getStockLevels } from '@/modules/ops/services/inventoryLedgerService';

type RecipeIngredientRow = {
  raw_material_id: string;
  quantity_consumed: number;
  waste_percent?: number | null;
};

export async function getAvailableServings(
  outletId: string,
  productId: string
): Promise<number | null> {
  try {
    const { data: recipe } = await supabase
      .from('recipes')
      .select('recipe_ingredients(raw_material_id, quantity_consumed, waste_percent)')
      .eq('product_id', productId)
      .maybeSingle();

    const ingredients = ((recipe as { recipe_ingredients?: RecipeIngredientRow[] } | null)?.recipe_ingredients ||
      []) as RecipeIngredientRow[];

    if (!ingredients.length) return null;

    const stock = await getStockLevels(
      outletId,
      ingredients.map((item) => item.raw_material_id)
    );

    let minServings = Number.POSITIVE_INFINITY;
    for (const item of ingredients) {
      const qtyPerServing = Number(item.quantity_consumed || 0) * (1 + Number(item.waste_percent || 0) / 100);
      if (!(qtyPerServing > 0)) continue;
      const available = Number(stock[item.raw_material_id] || 0);
      const servings = available / qtyPerServing;
      minServings = Math.min(minServings, servings);
    }

    return Number.isFinite(minServings) ? Math.max(0, Number(minServings.toFixed(4))) : null;
  } catch {
    return null;
  }
}
