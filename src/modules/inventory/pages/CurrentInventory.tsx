import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, ArrowUpDown, Filter } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface InventoryItem {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  status: 'Low Stock' | 'Optimal';
  item_type: string;
}

const fetchInventory = async (companyId?: string): Promise<InventoryItem[]> => {
  // 1. Fetch Products
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id, code, name, unit, min_stock, item_type, categories(name)')
    .eq('is_active', true)
    .order('name');
    
  if (productsError) throw productsError;

  // 2. Fetch Live Inventory
  let invQuery = supabase.from('inventory').select('product_id, current_quantity');
  // Add company/franchise filter here in the future if inventory table has company_id
  
  const { data: invData, error: invError } = await invQuery;
  if (invError) throw invError;

  // 3. Aggregate Inventory
  const invMap: Record<string, number> = {};
  invData?.forEach((row: any) => {
    invMap[row.product_id] = (invMap[row.product_id] || 0) + (Number(row.current_quantity) || 0);
  });

  // 4. Merge
  return productsData.map((p: any) => {
    const qty = invMap[p.id] || 0;
    const min = p.min_stock || 10;
    return {
      id: p.id,
      productCode: p.code,
      productName: p.name,
      category: p.categories?.name || 'Uncategorized',
      quantity: qty,
      unit: p.unit || 'Unit',
      minStock: min,
      status: qty < min ? 'Low Stock' : 'Optimal',
      item_type: p.item_type || 'raw_material'
    };
  });
};

export function CurrentInventory() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'raw_material' | 'ready_product'>('all');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['current-inventory', user?.companyId],
    queryFn: () => fetchInventory(user?.companyId),
  });

  const filteredInventory = inventory?.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.item_type === typeFilter;
    return matchesSearch && matchesType;
  });

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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Product Name</TableHead>
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
                      <TableCell className="font-semibold text-slate-900">{item.productName}</TableCell>
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
                      <TableCell className="text-right font-medium">
                        {item.quantity} <span className="text-slate-400 text-xs ml-1">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right text-slate-500">
                        {item.minStock} <span className="text-slate-400 text-xs ml-1">{item.unit}</span>
                      </TableCell>
                      <TableCell>
                        {item.status === 'Optimal' ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Optimal
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                            Low Stock
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
