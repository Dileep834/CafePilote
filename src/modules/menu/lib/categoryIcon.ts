import {
  Boxes,
  Coffee,
  Cookie,
  CupSoda,
  IceCream2,
  Package,
  Pizza,
  Salad,
  Sandwich,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

const RULES: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /burger|sandwich|bun|pav/i, icon: Sandwich },
  { match: /pizza|base/i, icon: Pizza },
  { match: /coffee|coffe|tea|powder/i, icon: Coffee },
  { match: /drink|soda|coke|water|cold|juice|crush|syrup/i, icon: CupSoda },
  { match: /dessert|chocolate|ice|cream|browni|cookie|sweet/i, icon: Cookie },
  { match: /ice.?cream|frozen milk/i, icon: IceCream2 },
  { match: /veg|salad|fruit|corn|mushroom|mint|chilli/i, icon: Salad },
  { match: /dairy|milk|cheese|paneer|butter/i, icon: Package },
  { match: /inventory|store|general|raw/i, icon: Boxes },
];

export function categoryIcon(name: string): LucideIcon {
  for (const rule of RULES) {
    if (rule.match.test(name)) return rule.icon;
  }
  return UtensilsCrossed;
}

export function productInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
