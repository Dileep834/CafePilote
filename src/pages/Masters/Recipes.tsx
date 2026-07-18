import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Autocomplete, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Divider } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import type { GridColDef } from '@mui/x-data-grid';
import DataTable from '../../components/DataTable';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const Recipes: React.FC = () => {
  const { user } = useAuthStore();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState<any | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number>(0);
  // Track existing recipe ID if we're editing
  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.companyId) {
      fetchProducts();
      loadRecipes();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      let query = supabase.from('products').select('*').order('name');
      if (user?.role !== 'Super Admin' && user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const loadRecipes = async () => {
    setLoading(true);
    try {
      // Fetch recipes with their linked product and ingredients
      let query = supabase
        .from('recipes')
        .select(`
          id,
          product_id,
          product:products!recipes_product_id_fkey(name),
          recipe_ingredients (
            id,
            raw_material_id,
            quantity_consumed,
            raw_material:products!recipe_ingredients_raw_material_id_fkey(name, unit)
          )
        `);
      if (user?.role !== 'Super Admin' && user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const formattedRecipes = (data || []).map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        productName: r.product?.name,
        ingredients: (r.recipe_ingredients || []).map((ing: any) => ({
          productId: ing.raw_material_id,
          name: ing.raw_material?.name,
          unit: ing.raw_material?.unit,
          quantity: ing.quantity_consumed
        }))
      }));
      
      setRecipes(formattedRecipes);
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (recipe?: any) => {
    if (recipe) {
      setCurrentRecipeId(recipe.id);
      const prod = products.find(p => p.id === recipe.productId);
      setSelectedProduct(prod || null);
      setIngredients(recipe.ingredients || []);
    } else {
      setCurrentRecipeId(null);
      setSelectedProduct(null);
      setIngredients([]);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentRecipeId(null);
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

  const handleSave = async () => {
    if (!selectedProduct || ingredients.length === 0 || !user?.companyId) return;
    setSaving(true);
    
    try {
      let recipeId = currentRecipeId;
      
      if (!recipeId) {
        // Create new recipe
        const { data: newRecipe, error: recipeErr } = await supabase
          .from('recipes')
          .insert([{ product_id: selectedProduct.id, company_id: user.companyId }])
          .select()
          .single();
          
        if (recipeErr) {
          if (recipeErr.code === '23505') {
            alert('A recipe for this product already exists!');
            setSaving(false);
            return;
          }
          throw recipeErr;
        }
        recipeId = newRecipe.id;
      } else {
        // If editing, first delete old ingredients so we can insert new ones
        const { error: delErr } = await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', recipeId);
        if (delErr) throw delErr;
        
        // Also update the product_id if they changed the finished product
        const { error: updErr } = await supabase
          .from('recipes')
          .update({ product_id: selectedProduct.id })
          .eq('id', recipeId);
        if (updErr) throw updErr;
      }

      // Insert all ingredients
      const ingsToInsert = ingredients.map(ing => ({
        recipe_id: recipeId,
        raw_material_id: ing.productId,
        quantity_consumed: ing.quantity
      }));
      
      const { error: ingErr } = await supabase
        .from('recipe_ingredients')
        .insert(ingsToInsert);
        
      if (ingErr) throw ingErr;
      
      await loadRecipes();
      handleClose();
    } catch (err: any) {
      console.error('Error saving recipe:', err);
      alert('Failed to save recipe: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this recipe?")) {
      try {
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) throw error;
        await loadRecipes();
      } catch (err: any) {
        console.error('Error deleting recipe:', err);
        alert('Failed to delete recipe: ' + err.message);
      }
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
        <DialogTitle>{currentRecipeId ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 4, pt: 1 }}>
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
                <Button variant="outlined" fullWidth onClick={addIngredient} disabled={!currentIngredient || currentQuantity <= 0} sx={{ height: '56px' }}>Add</Button>
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
