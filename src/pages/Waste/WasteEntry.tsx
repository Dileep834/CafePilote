import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem, Snackbar, Alert } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getTenantOutletId } from '../../store/useTenantStore';
import { getScopedCompanyId } from '../../lib/tenantScope';

const WasteEntry: React.FC = () => {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  
  // Form State
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchWasteLogs();
    }
  }, [user]);

  const fetchProducts = async () => {
    const companyId = getScopedCompanyId(user);
    let query = supabase.from('products').select('id, name, unit').eq('is_active', true).order('name');
    if (companyId) query = query.eq('company_id', companyId);
    
    const { data, error } = await query;
    if (error) console.error(error);
    if (data) setProducts(data);
  };

  const fetchWasteLogs = async () => {
    const outletId = getTenantOutletId(user) || user?.outletId;
    setLoading(true);
    try {
      let query = supabase
        .from('waste_logs')
        .select(`
          id, date, quantity, reason, logged_by,
          product:products(name, unit)
        `)
        .order('date', { ascending: false })
        .limit(50);

      if (outletId && outletId !== 'current-outlet') {
        query = query.eq('outlet_id', outletId);
      }

      const { data, error } = await query;
      if (error) throw error;
        
      if (data) {
        setRows(data.map(item => ({
          id: item.id,
          date: new Date(item.date).toLocaleDateString(),
          product: item.product?.name || 'Unknown',
          quantity: item.quantity,
          unit: item.product?.unit || '',
          reason: item.reason,
          loggedBy: item.logged_by
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const outletId = getTenantOutletId(user) || user?.outletId;
    if (!productId || !quantity || !reason || !outletId || outletId === 'current-outlet') {
      setSnackbar({ open: true, message: "Please fill all fields and select a branch.", severity: 'error' });
      return;
    }

    const companyId = getScopedCompanyId(user);
    const { error } = await supabase.from('waste_logs').insert([{
      outlet_id: outletId,
      company_id: companyId,
      product_id: productId,
      quantity: parseFloat(quantity),
      reason: reason,
      logged_by: user?.name,
      date: new Date().toISOString().split('T')[0]
    }]);

    if (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Error adding waste log.", severity: 'error' });
      return;
    }

    // Deduct from inventory
    try {
      const { data: invData } = await supabase
        .from('inventory')
        .select('current_quantity')
        .eq('outlet_id', outletId)
        .eq('product_id', productId)
        .single();
        
      const currentQty = invData ? Number(invData.current_quantity) : 0;
      const newQty = currentQty - parseFloat(quantity);
      
      await supabase.from('inventory').upsert({
        outlet_id: outletId,
        product_id: productId,
        current_quantity: newQty
      }, { onConflict: 'outlet_id, product_id' });
    } catch (err) {
      console.error("Error updating inventory:", err);
    }

    setProductId('');
    setQuantity('');
    setReason('');
    fetchWasteLogs(); // Refresh grid
    setSnackbar({ open: true, message: "Waste log added successfully!", severity: 'success' });
  };

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', width: 130 },
    { field: 'product', headerName: 'Product', flex: 1 },
    { field: 'quantity', headerName: 'Qty', width: 100 },
    { field: 'unit', headerName: 'Unit', width: 100 },
    { field: 'reason', headerName: 'Reason', width: 150 },
    { field: 'loggedBy', headerName: 'Logged By', width: 150 },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Log Wastage Log</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 2fr auto' }, gap: 2, alignItems: 'center' }}>
          <TextField 
            select 
            fullWidth 
            label="Product" 
            size="small" 
            value={productId} 
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.name} ({p.unit})</MenuItem>
            ))}
          </TextField>
          <TextField 
            fullWidth 
            label="Quantity" 
            type="number" 
            size="small" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <TextField 
            fullWidth 
            label="Reason" 
            size="small" 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="contained" fullWidth startIcon={<Add />} onClick={handleSubmit}>Add</Button>
        </Box>
      </Paper>
      
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography variant="h6" gutterBottom>Recent Waste Logs</Typography>
        <Box sx={{ flexGrow: 1, minHeight: 300 }}>
          <DataGrid rows={rows} columns={columns} loading={loading} sx={{ border: 'none' }} />
        </Box>
      </Paper>
      
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', boxShadow: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WasteEntry;
