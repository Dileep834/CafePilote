import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Autocomplete, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Divider, Alert, Snackbar } from '@mui/material';
import { Delete, ShoppingCart, PrecisionManufacturing } from '@mui/icons-material';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useFeedback } from '../../hooks/useFeedback';
import { v4 as uuidv4 } from 'uuid';

const SalesEntry: React.FC = () => {
  const { user } = useAuthStore();
  const { showFeedback, FeedbackComponent } = useFeedback();
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [toastOpen, setToastOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.companyId) {
      fetchProducts();
      fetchRecipes();
      fetchSalesHistory();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', user?.companyId)
        .order('name');
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id,
          product_id,
          recipe_ingredients (
            raw_material_id,
            quantity_consumed,
            raw_material:products!recipe_ingredients_raw_material_id_fkey(name, unit)
          )
        `)
        .eq('company_id', user?.companyId);
      if (error) throw error;
      
      const formatted = (data || []).map((r: any) => ({
        productId: r.product_id,
        ingredients: (r.recipe_ingredients || []).map((ing: any) => ({
          productId: ing.raw_material_id,
          name: ing.raw_material?.name,
          unit: ing.raw_material?.unit,
          quantity: ing.quantity_consumed
        }))
      }));
      setRecipes(formatted);
    } catch (err) {
      console.error('Error fetching recipes:', err);
    }
  };

  const fetchSalesHistory = async () => {
    if (!user?.outletId) return;
    try {
      // Fetch recent sales for this outlet
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          sale_date,
          sale_items (
            quantity,
            product:products!sale_items_product_id_fkey(id, name)
          )
        `)
        .eq('outlet_id', user.outletId)
        .order('sale_date', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      const formatted = (data || []).map((sale: any) => ({
        id: sale.id,
        timestamp: sale.sale_date,
        items: (sale.sale_items || []).map((item: any) => ({
          id: uuidv4(),
          qty: item.quantity,
          product: { id: item.product?.id, name: item.product?.name }
        })),
        // Raw materials deduction history logic is complex to re-derive historically without joining recipes again,
        // so for historical rows we will just show the items sold. The new rows will calculate it on the fly.
        rawMaterialsConsumed: [] 
      }));
      
      setSalesHistory(formatted);
    } catch (err) {
      console.error('Error fetching sales history:', err);
    }
  };

  // Only allow adding products that have a recipe defined (they are finished goods)
  const finishedGoods = products.filter(p => recipes.some(r => r.productId === p.id));

  const addToCart = () => {
    if (!selectedProduct || quantity <= 0) return;
    
    const existing = cart.find(item => item.product.id === selectedProduct.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === selectedProduct.id ? { ...item, qty: item.qty + quantity } : item));
    } else {
      setCart([...cart, { id: uuidv4(), product: selectedProduct, qty: quantity }]);
    }
    
    setSelectedProduct(null);
    setQuantity(1);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const processSale = async () => {
    if (cart.length === 0 || !user?.companyId || !user?.outletId) return;
    setProcessing(true);
    
    try {
      // Calculate raw material consumption for UI log
      const consumptionMap: Record<string, {name: string, unit: string, totalQty: number}> = {};
      
      cart.forEach(cartItem => {
        const recipe = recipes.find(r => r.productId === cartItem.product.id);
        if (recipe && recipe.ingredients) {
          recipe.ingredients.forEach((ing: any) => {
            if (!consumptionMap[ing.productId]) {
              consumptionMap[ing.productId] = { name: ing.name, unit: ing.unit, totalQty: 0 };
            }
            consumptionMap[ing.productId].totalQty += (ing.quantity * cartItem.qty);
          });
        }
      });

      // 1. Insert into Sales table
      const { data: saleData, error: saleErr } = await supabase
        .from('sales')
        .insert([{
          company_id: user.companyId,
          outlet_id: user.outletId,
          sold_by: user.id,
          total_amount: 0 // Mock price for now
        }])
        .select()
        .single();
        
      if (saleErr) throw saleErr;

      // 2. Insert into Sale Items table
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        quantity: item.qty,
        price_at_sale: 0
      }));
      
      const { error: itemsErr } = await supabase
        .from('sale_items')
        .insert(saleItems);
        
      if (itemsErr) throw itemsErr;

      // 3. Update Inventory and Daily Stock for Raw Materials
      const dateStr = new Date().toISOString().split('T')[0];
      
      for (const [productId, data] of Object.entries(consumptionMap)) {
        // Fetch current inventory
        const { data: invData } = await supabase
          .from('inventory')
          .select('current_quantity')
          .eq('outlet_id', user.outletId)
          .eq('product_id', productId)
          .single();
          
        const currentQty = invData ? Number(invData.current_quantity) : 0;
        
        // Deduct from inventory
        await supabase.from('inventory').upsert({
          outlet_id: user.outletId,
          product_id: productId,
          current_quantity: currentQty - data.totalQty
        }, { onConflict: 'outlet_id, product_id' });

        // Update Daily Stock consumption
        const { data: dsData } = await supabase
          .from('daily_stock')
          .select('id, opening_stock, purchase, consumption, waste')
          .eq('outlet_id', user.outletId)
          .eq('product_id', productId)
          .eq('date', dateStr)
          .single();

        if (dsData) {
          const newConsumption = Number(dsData.consumption) + data.totalQty;
          const newClosing = Number(dsData.opening_stock) + Number(dsData.purchase) - newConsumption - Number(dsData.waste);
          await supabase.from('daily_stock').update({
            consumption: newConsumption,
            closing_stock: newClosing
          }).eq('id', dsData.id);
        } else {
          // Create daily stock entry if it doesn't exist
          const opening = currentQty; 
          const newConsumption = data.totalQty;
          const newClosing = opening - newConsumption;
          
          await supabase.from('daily_stock').insert({
            company_id: user.companyId,
            outlet_id: user.outletId,
            product_id: productId,
            date: dateStr,
            opening_stock: opening,
            purchase: 0,
            consumption: newConsumption,
            waste: 0,
            closing_stock: newClosing,
            status: 'Draft'
          });
        }
      }

      // Add to local UI history so they instantly see it with raw materials calculated
      const newSale = {
        id: saleData.id,
        timestamp: saleData.sale_date,
        items: cart,
        rawMaterialsConsumed: Object.values(consumptionMap)
      };

      setSalesHistory([newSale, ...salesHistory]);
      setCart([]);
      showFeedback("Sale processed successfully! Inventory deducted.", "success");
      
    } catch (err: any) {
      console.error('Error processing sale:', err);
      showFeedback('Failed to process sale: ' + err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <ShoppingCart fontSize="large" color="primary" /> Point of Sale (BOM Integrated)
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>1. Log Sale</Typography>
            
            {finishedGoods.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                No finished goods found. Please create a Recipe first in the Recipe Master page before you can log sales.
              </Alert>
            ) : (
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={8}>
                  <Autocomplete
                    options={finishedGoods}
                    getOptionLabel={(option) => option.name}
                    value={selectedProduct}
                    onChange={(e, newValue) => setSelectedProduct(newValue)}
                    renderInput={(params) => <TextField {...params} label="Select Finished Good" />}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField 
                    fullWidth 
                    label="Quantity" 
                    type="number" 
                    value={quantity || ''} 
                    onChange={e => setQuantity(Number(e.target.value))} 
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="outlined" fullWidth onClick={addToCart} disabled={!selectedProduct || quantity <= 0}>
                    Add to Cart
                  </Button>
                </Grid>
              </Grid>
            )}

            <Divider sx={{ mb: 3 }} />

            <Typography variant="h6" gutterBottom>Current Cart</Typography>
            {cart.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>Cart is empty</Typography>
            ) : (
              <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell align="right">{item.qty}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => removeFromCart(item.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            <Button 
              variant="contained" 
              size="large" 
              color="success" 
              fullWidth 
              sx={{ mt: 3, py: 2, fontSize: '1.1rem' }}
              onClick={processSale}
              disabled={cart.length === 0 || processing}
            >
              {processing ? 'Processing...' : 'Process Sale & Deduct Inventory'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%', bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PrecisionManufacturing color="primary" /> Recent Sales Activity
            </Typography>
            
            {salesHistory.length === 0 ? (
              <Typography color="text.secondary">No sales recorded yet.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', maxHeight: '70vh' }}>
                {salesHistory.map(sale => (
                  <Paper key={sale.id} sx={{ p: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(sale.timestamp).toLocaleString()}
                    </Typography>
                    
                    <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 'bold' }}>Items Sold:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {sale.items.map((item: any) => (
                        <li key={item.id}>{item.qty}x {item.product.name}</li>
                      ))}
                    </ul>

                    {sale.rawMaterialsConsumed && sale.rawMaterialsConsumed.length > 0 && (
                      <>
                        <Typography variant="subtitle2" color="error.main" sx={{ mt: 2, fontWeight: 'bold' }}>Auto-Deducted Raw Materials:</Typography>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: 'gray' }}>
                          {sale.rawMaterialsConsumed.map((rm: any, idx: number) => (
                            <li key={idx}>-{rm.totalQty} {rm.unit} of {rm.name}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {FeedbackComponent}
    </Box>
  );
};

export default SalesEntry;
