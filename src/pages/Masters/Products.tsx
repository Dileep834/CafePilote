import { formatCurrency } from '../../utils/format';
import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Accordion, AccordionSummary, AccordionDetails, Typography, Paper, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete, ExpandMore } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import type { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getScopedCompanyId } from '../../lib/tenantScope';
import { HQ_COMPANY_ID } from '../../constants';

const Products: React.FC = () => {
  const { user } = useAuthStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({ is_active: true });
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    try {
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('categories').select('id, name');
      if (companyId) query = query.eq('company_id', companyId);
      const { data } = await query;
      if (data) setCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('products').select('*, categories(name)').order('name');
      if (companyId) query = query.eq('company_id', companyId);
      
      const { data, error } = await query;
      
      if (error) throw error;
      if (data) {
        setProducts(data.map(p => ({ ...p, categoryName: (p.categories as any)?.name || 'Uncategorized' })));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (product?: Product) => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({ 
        code: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
        is_active: true,
        company_id: getScopedCompanyId(user) || HQ_COMPANY_ID,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (formData.id) {
        // Update
        const dataToSave = { ...formData };
        delete dataToSave.category;
        delete dataToSave.categoryName;
        const { error } = await supabase.from('products').update(dataToSave).eq('id', formData.id);
        if (error) throw error;
      } else {
        // Insert
        const dataToSave = { ...formData };
        delete dataToSave.category;
        delete dataToSave.categoryName;
        const { error } = await supabase.from('products').insert([dataToSave]);
        if (error) throw error;
      }
      handleClose();
      fetchProducts();
    } catch (error) {
      console.error("Error saving product", error);
      alert("Error saving product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) fetchProducts();
    }
  };

  const columns: GridColDef[] = [
    { field: 'code', headerName: 'Product Code', width: 120 },
    { field: 'name', headerName: 'Product Name', flex: 1, minWidth: 200 },
    { field: 'categoryName', headerName: 'Category', width: 180 },
    { field: 'brand', headerName: 'Brand', width: 150 },
    { field: 'unit', headerName: 'Unit', width: 100 },
    { 
      field: 'purchase_price', 
      headerName: 'Purchase Price', 
      width: 130,
      valueFormatter: (params: any) => {
        const val = Number(params.value);
        return isNaN(val) ? '-' : `₹${val.toFixed(2)}`;
      }
    },
    { 
      field: 'is_active', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params: any) => (
        <Chip 
          label={params.value ? 'Active' : 'Inactive'} 
          color={params.value ? 'success' : 'default'} 
          size="small" 
        />
      )
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', pb: { xs: 8, sm: 0 } }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Products Catalog
        </Typography>
        {!isMobile && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
            Add Product
          </Button>
        )}
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {loading ? (
          <Typography sx={{ p: 2 }}>Loading products...</Typography>
        ) : (
          Object.entries(
            products.reduce((acc, product) => {
              const category = product.categoryName || 'Uncategorized';
              if (!acc[category]) acc[category] = [];
              acc[category].push(product);
              return acc;
            }, {} as Record<string, Product[]>)
          ).map(([category, catProducts]) => (
            <Accordion key={category} defaultExpanded sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'background.default' }}>
                <Typography variant="h6">{category} <Chip label={catProducts.length} size="small" sx={{ ml: 1 }} /></Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <DataTable 
                  title="" 
                  columns={columns} 
                  rows={catProducts}
                />
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* Mobile sticky bottom Add button */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            px: 2,
            py: 1.5,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.10)',
          }}
        >
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
            fullWidth
            sx={{ height: 48, borderRadius: 2, fontWeight: 700, fontSize: '0.95rem' }}
          >
            Add Product
          </Button>
        </Box>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{formData.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField 
              fullWidth 
              label="Product Code" 
              value={formData.code || ''} 
              onChange={e => setFormData({...formData, code: e.target.value})} 
            />
            <TextField 
              fullWidth 
              label="Product Name" 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <TextField 
              select
              fullWidth 
              label="Category" 
              value={formData.category_id || ''} 
              onChange={e => setFormData({...formData, category_id: e.target.value})} 
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {categories.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField 
              fullWidth 
              label="Brand" 
              value={formData.brand || ''} 
              onChange={e => setFormData({...formData, brand: e.target.value})} 
            />
            <TextField 
              fullWidth 
              label="Unit (e.g. Kg, Box)" 
              value={formData.unit || ''} 
              onChange={e => setFormData({...formData, unit: e.target.value})} 
            />
            <TextField 
              fullWidth 
              type="number"
              label="Purchase Price" 
              value={formData.purchase_price || ''} 
              onChange={e => setFormData({...formData, purchase_price: Number(e.target.value)})} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;
