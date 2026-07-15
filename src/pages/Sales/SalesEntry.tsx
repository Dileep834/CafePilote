import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Autocomplete, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, IconButton, Divider, Alert, Snackbar } from '@mui/material';
import { Delete, ShoppingCart, PrecisionManufacturing } from '@mui/icons-material';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const SalesEntry: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    const savedRecipes = localStorage.getItem('mock_recipes');
    if (savedRecipes) setRecipes(JSON.parse(savedRecipes));
    
    const savedSales = localStorage.getItem('mock_sales');
    if (savedSales) setSalesHistory(JSON.parse(savedSales));
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
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

  const processSale = () => {
    if (cart.length === 0) return;
    
    const timestamp = new Date().toISOString();
    
    // Calculate raw material consumption
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

    const newSale = {
      id: uuidv4(),
      timestamp,
      items: cart,
      rawMaterialsConsumed: Object.values(consumptionMap)
    };

    const newHistory = [newSale, ...salesHistory];
    setSalesHistory(newHistory);
    localStorage.setItem('mock_sales', JSON.stringify(newHistory));
    
    setCart([]);
    setToastOpen(true);
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
              disabled={cart.length === 0}
            >
              Process Sale & Deduct Inventory
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
                {salesHistory.slice(0, 5).map(sale => (
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

                    <Typography variant="subtitle2" color="error.main" sx={{ mt: 2, fontWeight: 'bold' }}>Auto-Deducted Raw Materials:</Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'gray' }}>
                      {sale.rawMaterialsConsumed.map((rm: any, idx: number) => (
                        <li key={idx}>-{rm.totalQty} {rm.unit} of {rm.name}</li>
                      ))}
                    </ul>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar open={toastOpen} autoHideDuration={4000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%' }} variant="filled">
          Sale Processed! Inventory automatically deducted via BOM.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SalesEntry;
