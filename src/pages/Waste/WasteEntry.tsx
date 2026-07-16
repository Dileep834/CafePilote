import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const WasteEntry: React.FC = () => {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (user?.companyId) {
      fetchProducts();
      fetchWasteLogs();
    }
  }, [user]);

  const fetchProducts = async () => {
    let query = supabase.from('products').select('id, name, unit').eq('is_active', true).order('name');
    
    // If not a platform super admin, lock products to their company
    if (user?.role !== 'SUPER_ADMIN' && user?.companyId) {
      query = query.eq('company_id', user.companyId);
    }
    
    const { data, error } = await query;
    if (error) console.error(error);
    if (data) setProducts(data);
  };

  const fetchWasteLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('waste_logs')
        .select(`
          id, date, quantity, reason, logged_by,
          product:products(name, unit)
        `)
        .order('date', { ascending: false })
        .limit(50);
        
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
    if (!productId || !quantity || !reason || !user?.outletId) {
      alert("Please fill all fields. Ensure you are logged in as a Outlet Manager.");
      return;
    }

    const { error } = await supabase.from('waste_logs').insert([{
      outlet_id: user.outletId,
      product_id: productId,
      quantity: parseFloat(quantity),
      reason: reason,
      logged_by: user.name,
      date: new Date().toISOString().split('T')[0]
    }]);

    if (!error) {
      setProductId('');
      setQuantity('');
      setReason('');
      fetchWasteLogs(); // Refresh grid
    } else {
      console.error(error);
      alert("Error adding waste log.");
    }
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
    </Box>
  );
};

export default WasteEntry;
