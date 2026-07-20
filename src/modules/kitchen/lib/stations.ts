/** Kitchen station routing — keyword / product.kitchen_station based */

export type KitchenStationDef = {
  id: string;
  label: string;
  keywords: string[];
};

export const DEFAULT_KITCHEN_STATIONS: KitchenStationDef[] = [
  { id: 'all', label: 'All stations', keywords: [] },
  { id: 'main', label: 'Main Kitchen', keywords: ['biryani', 'curry', 'thali', 'rice', 'naan', 'chicken', 'paneer', 'tandoor'] },
  { id: 'tandoor', label: 'Tandoor', keywords: ['tandoor', 'naan', 'roti', 'kebab', 'tikka'] },
  { id: 'bar', label: 'Bar', keywords: ['cocktail', 'mocktail', 'beer', 'wine', 'whisky', 'mojito'] },
  { id: 'coffee', label: 'Coffee', keywords: ['coffee', 'cappuccino', 'latte', 'espresso', 'mocha', 'americano'] },
  { id: 'dessert', label: 'Dessert', keywords: ['cake', 'brownie', 'ice cream', 'dessert', 'pastry', 'gulab'] },
];

export function orderMatchesStation(
  stationId: string,
  itemNames: string[],
  productStations?: Array<string | null | undefined>
): boolean {
  if (stationId === 'all') return true;
  const station = DEFAULT_KITCHEN_STATIONS.find((s) => s.id === stationId);
  if (!station) return true;

  if (productStations?.some((s) => s === stationId)) return true;

  const hay = itemNames.join(' ').toLowerCase();
  if (station.id === 'main') {
    // Main gets everything that doesn't clearly belong elsewhere
    const others = DEFAULT_KITCHEN_STATIONS.filter((s) => !['all', 'main'].includes(s.id));
    const belongsElsewhere = others.some((s) => s.keywords.some((k) => hay.includes(k)));
    return !belongsElsewhere || station.keywords.some((k) => hay.includes(k));
  }
  return station.keywords.some((k) => hay.includes(k));
}
