import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Autocomplete, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Divider } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import type { GridColDef } from '@mui/x-data-grid';
import DataTable from '../../components/DataTable';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';

const Recipes: React.FC = () => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState<any | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);

  useEffect(() => {
    fetchProducts();
    loadRecipes();
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

  const loadRecipes = () => {
    const saved = localStorage.getItem('mock_recipes');
    if (saved) {
      setRecipes(JSON.parse(saved));
    } else {
      setRecipes([]);
    }
    setLoading(false);
  };

  const saveToDb = (data: any[]) => {
    setRecipes(data);
    localStorage.setItem('mock_recipes', JSON.stringify(data));
  };

  const handleOpen = (recipe?: any) => {
    if (recipe) {
      const prod = products.find(p => p.id === recipe.productId);
      setSelectedProduct(prod || null);
      setIngredients(recipe.ingredients || []);
    } else {
      setSelectedProduct(null);
      setIngredients([]);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedProduct(null);
    setIngredients([]);
    setCurrentIngredient(null);
    setCurrentQuantity(0);
  };

  const addIngredient = () => {
    if (!currentIngredient || currentQuantity <= 0) return;
    const exists = ingredients.find(i => i.productId === currentIngredient.id);
    if (exists) {
      setIngredients(ingredients.map(i => i.productId === currentIngredient.id ? { ...i, quantity: currentQuantity } : i));
    } else {
      setIngredients([...ingredients, { productId: currentIngredient.id, name: currentIngredient.name, unit: currentIngredient.unit, quantity: currentQuantity }]);
    }
    setCurrentIngredient(null);
    setCurrentQuantity(0);
  };

  const removeIngredient = (productId: string) => {
    setIngredients(ingredients.filter(i => i.productId !== productId));
  };

  const handleSave = () => {
    if (!selectedProduct) return;
    setSaving(true);
    
    const newRecipe = {
      id: selectedProduct.id, // 1 recipe per product
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      ingredients: ingredients
    };

    let updated;
    const exists = recipes.find(r => r.id === newRecipe.id);
    if (exists) {
      updated = recipes.map(r => r.id === newRecipe.id ? newRecipe : r);
    } else {
      updated = [...recipes, newRecipe];
    }
    
    saveToDb(updated);
    setSaving(false);
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this recipe?")) {
      const updated = recipes.filter(r => r.id !== id);
      saveToDb(updated);
    }
  };

  const columns: GridColDef[] = [
    { field: 'productName', headerName: 'Finished Product', flex: 1, minWidth: 200 },
    { 
      field: 'ingredientsCount', 
      headerName: 'Ingredients Count', 
      width: 150,
      valueGetter: (params: any, row: any) => row.ingredients?.length || 0
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <IconButton size="small" color="primary" onClick={() => handleOpen(params.row)}><Edit fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}><Delete fontSize="small" /></IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1 }}>
        <DataTable 
          title="Recipe Management (BOM)" 
          columns={columns} 
          rows={recipes} 
          loading={loading}
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
              Create Recipe
            </Button>
          }
        />
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{selectedProduct ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>1. Select Finished Product (What you sell)</Typography>
            <Autocomplete
              options={products}
              getOptionLabel={(option) => option.name}
              value={selectedProduct}
              onChange={(e, newValue) => setSelectedProduct(newValue)}
              renderInput={(params) => <TextField {...params} label="Finished Product" placeholder="e.g. Latte" />}
            />
          </Box>
          
          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="subtitle2" gutterBottom>2. Add Raw Materials (What it consumes)</Typography>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => option.name + (option.unit ? ` (${option.unit})` : '')}
                  value={currentIngredient}
                  onChange={(e, newValue) => setCurrentIngredient(newValue)}
                  renderInput={(params) => <TextField {...params} label="Raw Material" placeholder="e.g. Milk" />}
                />
              </Grid>
              <Grid item xs={8} sm={4}>
                <TextField 
                  fullWidth 
                  label="Quantity" 
                  type="number" 
                  value={currentQuantity || ''} 
                  onChange={e => setCurrentQuantity(Number(e.target.value))} 
                  InputProps={{
                    endAdornment: currentIngredient?.unit ? <Typography variant="caption" sx={{ ml: 1 }}>{currentIngredient.unit}</Typography> : null
                  }}
                />
              </Grid>
              <Grid item xs={4} sm={2}>
                <Button variant="outlined" fullWidth onClick={addIngredient} disabled={!currentIngredient || currentQuantity <= 0}>Add</Button>
              </Grid>
            </Grid>

            {ingredients.length > 0 && (
              <Paper variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Raw Material</TableCell>
                      <TableCell>Quantity consumed per unit</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ingredients.map(ing => (
                      <TableRow key={ing.productId}>
                        <TableCell>{ing.name}</TableCell>
                        <TableCell>{ing.quantity} {ing.unit}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => removeIngredient(ing.productId)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !selectedProduct || ingredients.length === 0}>
            {saving ? 'Saving...' : 'Save Recipe'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Recipes;
