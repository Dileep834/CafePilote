import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, Filter, AlertTriangle, Boxes, IndianRupee, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface InventoryItem {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  status: 'Not Counted' | 'Out of Stock' | 'Low Stock' | 'Optimal';
  item_type: string;
  unitCost: number;
  stockValue: number;
}

type ProductRow = {
  id: string;
  code?: string | null;
  name?: string | null;
  unit?: string | null;
  min_stock?: number | string | null;
  item_type?: string | null;
  purchase_price?: number | string | null;
  selling_price?: number | string | null;
  categories?: { name?: string | null } | { name?: string | null }[] | null;
};

type InventoryRow = {
  product_id?: string | null;
  current_quantity?: number | string | null;
};

const PRODUCT_SELECT_BASE = 'id, code, name, unit, min_stock, item_type, categories(name)';
const PRODUCT_SELECT_WITH_PRICE = `${PRODUCT_SELECT_BASE}, purchase_price, selling_price`;

function isMissingSchemaField(error: unknown) {
  const candidate = error as { message?: string; details?: string; hint?: string; code?: string };
  const text = [candidate?.message, candidate?.details, candidate?.hint, candidate?.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('schema cache') ||
    text.includes('does not exist') ||
    text.includes('column') ||
    text.includes('relation')
  );
}

function getCategoryName(category: ProductRow['categories']) {
  if (Array.isArray(category)) return category[0]?.name || 'Uncategorized';
  return category?.name || 'Uncategorized';
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function getInventoryStatus(qty: number, min: number, hasStockRecord: boolean): InventoryItem['status'] {
  if (!hasStockRecord) return 'Not Counted';
  if (qty <= 0) return 'Out of Stock';
  if (min > 0 && qty <= min) return 'Low Stock';
  return 'Optimal';
}

function getStatusClass(status: InventoryItem['status']) {
  if (status === 'Optimal') {
    return 'bg-green-50 text-green-700 ring-green-600/20';
  }

  if (status === 'Low Stock') {
    return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  }

  if (status === 'Out of Stock') {
    return 'bg-red-50 text-red-700 ring-red-600/10';
  }

  return 'bg-slate-100 text-slate-700 ring-slate-300';
}

const fetchInventory = async (_companyId?: string): Promise<InventoryItem[]> => {
  // 1. Fetch Products
  let { data: productsData, error: productsError } = await supabase
    .from('products')
    .select(PRODUCT_SELECT_WITH_PRICE)
    .eq('is_active', true)
    .order('name');

  if (productsError && isMissingSchemaField(productsError)) {
    const fallback = await supabase
      .from('products')
      .select(PRODUCT_SELECT_BASE)
      .eq('is_active', true)
      .order('name');

    productsData = fallback.data;
    productsError = fallback.error;
  }

  if (productsError) throw productsError;

  // 2. Fetch Live Inventory
  const invQuery = supabase.from('inventory').select('product_id, current_quantity');
  // Add company/franchise filter here in the future if inventory table has company_id

  const { data: inventoryData, error: invError } = await invQuery;
  if (invError && !isMissingSchemaField(invError)) throw invError;
  const invData = invError ? [] : inventoryData;

  // 3. Aggregate Inventory
  const invMap: Record<string, number> = {};
  const productsWithStockRows = new Set<string>();
  (invData as InventoryRow[] | null)?.forEach((row) => {
    if (!row.product_id) return;
    productsWithStockRows.add(row.product_id);
    invMap[row.product_id] = (invMap[row.product_id] || 0) + toNumber(row.current_quantity);
  });

  // 4. Merge
  return ((productsData || []) as ProductRow[]).map((p) => {
    const hasStockRecord = productsWithStockRows.has(p.id);
    const qty = invMap[p.id] || 0;
    const min = Math.max(0, toNumber(p.min_stock));
    const unitCost = toNumber(p.purchase_price ?? p.selling_price);
    return {
      id: p.id,
      productCode: p.code || '',
      productName: p.name || 'Unnamed item',
      category: getCategoryName(p.categories),
      quantity: qty,
      unit: p.unit || 'Unit',
      minStock: min,
      status: getInventoryStatus(qty, min, hasStockRecord),
      item_type: p.item_type || 'raw_material',
      unitCost,
      stockValue: qty * unitCost,
    };
  });
};

export function CurrentInventory() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'raw_material' | 'ready_product'>('all');

  const { data: inventory = [], isLoading, error } = useQuery({
    queryKey: ['current-inventory', user?.companyId],
    queryFn: () => fetchInventory(user?.companyId),
  });
  const loadError = error instanceof Error ? error.message : error ? 'Unable to load current inventory.' : '';

  const filteredInventory = inventory?.filter(item => {
    const needle = searchTerm.toLowerCase();
    const matchesSearch = item.productName.toLowerCase().includes(needle) ||
                         item.productCode.toLowerCase().includes(needle);
    const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
    return matchesSearch && matchesType;
  });
  const inventoryStats = React.useMemo(() => {
    const rows = inventory || [];
    const attention = rows.filter((item) => item.status !== 'Optimal');
    const value = rows.reduce((sum, item) => sum + item.stockValue, 0);
    const raw = rows.filter((item) => item.item_type === 'raw_material').length;
    return {
      total: rows.length,
      attention: attention.length,
      raw,
      ready: rows.length - raw,
      value,
      suggestions: attention.length,
    };
  }, [inventory]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Current Inventory</h1>
          <p className="text-slate-500 mt-2">Monitor live stock levels across all your raw materials and products.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Items tracked', value: inventoryStats.total, icon: Boxes, tone: 'text-slate-700 bg-slate-50' },
          { label: 'Needs attention', value: inventoryStats.attention, icon: AlertTriangle, tone: inventoryStats.attention > 0 ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50' },
          { label: 'Stock value', value: formatCurrency(inventoryStats.value), icon: IndianRupee, tone: 'text-emerald-700 bg-emerald-50' },
          { label: 'Purchase suggestions', value: inventoryStats.suggestions, icon: TrendingDown, tone: 'text-amber-700 bg-amber-50' },
          { label: 'Raw / Ready', value: `${inventoryStats.raw}/${inventoryStats.ready}`, icon: Filter, tone: 'text-sky-700 bg-sky-50' },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black uppercase tracking-wider text-slate-400">{stat.label}</p>
                <p className="truncate text-lg font-black text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {[
          'Auto recipe deduction tracks ingredient use when KOT is fired.',
          'Expiry, batch, and vendor comparison can be reviewed during daily stock.',
          'Actual vs theoretical variance is highlighted from low-stock and closing gaps.',
        ].map((text) => (
          <div key={text} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            {text}
          </div>
        ))}
      </div>

      {loadError ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-black">Inventory could not load from Supabase.</p>
            <p className="mt-1 text-red-700">{loadError}</p>
          </div>
        </div>
      ) : null}

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search products by name or code..."
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('all')}
                className="flex-1 sm:flex-none"
              >
                All Items
              </Button>
              <Button
                variant={typeFilter === 'raw_material' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('raw_material')}
                className="flex-1 sm:flex-none"
              >
                Raw Materials
              </Button>
              <Button
                variant={typeFilter === 'ready_product' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('ready_product')}
                className="flex-1 sm:flex-none"
              >
                Ready Products
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead className="sticky left-0 bg-slate-50 z-10 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-100">Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                        Loading inventory data...
                      </TableCell>
                    </TableRow>
                  ) : loadError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-red-700">
                        Current inventory is unavailable. Check the error message above.
                      </TableCell>
                    </TableRow>
                  ) : filteredInventory?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                        No inventory items found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory?.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-600">{item.productCode}</TableCell>
                        <TableCell className="sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-bold text-slate-900 border-r border-slate-100">{item.productName}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                            {item.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                            {item.item_type === 'ready_product' ? 'Ready' : 'Raw'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          {item.quantity} <span className="text-slate-400 text-xs ml-1 font-normal">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-slate-500">
                          {item.minStock} <span className="text-slate-400 text-xs ml-1">{item.unit}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClass(item.status)}`}>
                            {item.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500 text-sm">Loading inventory data...</div>
              ) : loadError ? (
                <div className="p-8 text-center text-red-700 text-sm">Current inventory is unavailable. Check the error message above.</div>
              ) : filteredInventory?.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No inventory items found.</div>
              ) : (
                filteredInventory?.map((item) => (
                  <div key={item.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-slate-900 text-base">{item.productName}</div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{item.productCode}</div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset uppercase tracking-wider ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {item.category}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 uppercase">
                        {item.item_type === 'ready_product' ? 'Ready' : 'Raw'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Current Stock</div>
                        <div className="font-black text-slate-900 text-lg">
                          {item.quantity} <span className="text-sm text-slate-500 font-medium">{item.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Min Stock</div>
                        <div className="font-bold text-slate-700 text-sm">
                          {item.minStock} <span className="text-xs text-slate-400 font-medium">{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        </CardContent>
      </Card>
    </div>
  );
}
