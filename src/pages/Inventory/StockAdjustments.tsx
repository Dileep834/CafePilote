import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem, Snackbar, Alert } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getScopedCompanyId } from '../../lib/tenantScope';

const StockAdjustments: React.FC = () => {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Form State
  const [productId, setProductId] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  useEffect(() => {
    fetchProducts();
    fetchAdjustments();
  }, [user]);

  const fetchProducts = async () => {
    const companyId = getScopedCompanyId(user);
    let query = supabase.from('products').select('id, name, unit').eq('is_active', true).order('name');
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    if (data) setProducts(data);
  };

  const fetchAdjustments = async () => {
    let query = supabase.from('stock_adjustments').select(`
      id, date, adjustment, reason, approved_by,
      product:products(name, unit)
    `).order('date', { ascending: false }).limit(50);
    
    if (user?.role !== 'Super Admin' && user?.outletId) {
      query = query.eq('outlet_id', user.outletId);
    }
    
    const { data } = await query;
    if (data) {
      setRows(data.map((item: any) => ({
        id: item.id,
        date: new Date(item.date).toLocaleDateString(),
        product: item.product?.name || 'Unknown',
        adjustment: item.adjustment,
        unit: item.product?.unit || '',
        reason: item.reason,
        approvedBy: item.approved_by
      })));
    }
  };

  const handleSubmit = async () => {
    if (!productId || !adjustment || !reason || !user?.outletId) {
      setSnackbar({ open: true, message: "Please fill all fields. Ensure you are logged in as an Outlet Manager.", severity: 'warning' });
      return;
    }

    setLoading(true);
    const adjValue = parseFloat(adjustment);

    try {
      // 1. Insert into stock_adjustments
      const { error: insertErr } = await supabase.from('stock_adjustments').insert([{
        outlet_id: user.outletId,
        company_id: user.companyId,
        product_id: productId,
        adjustment: adjValue,
        reason: reason,
        approved_by: user.name,
        date: new Date().toISOString().split('T')[0]
      }]);

      if (insertErr) throw insertErr;

      // 2. Update live inventory
      const { data: invData } = await supabase
        .from('inventory')
        .select('current_quantity')
        .eq('outlet_id', user.outletId)
        .eq('product_id', productId)
        .single();
        
      const currentQty = invData ? Number(invData.current_quantity) : 0;
      const newQty = currentQty + adjValue; // Positive adds, negative subtracts
      
      const { error: invErr } = await supabase.from('inventory').upsert({
        outlet_id: user.outletId,
        product_id: productId,
        current_quantity: newQty
      }, { onConflict: 'outlet_id, product_id' });

      if (invErr) throw invErr;

      setProductId('');
      setAdjustment('');
      setReason('');
      fetchAdjustments();
      setSnackbar({ open: true, message: "Stock adjustment saved successfully!", severity: 'success' });

    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: "Error saving adjustment: " + err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', width: 130 },
    { field: 'product', headerName: 'Product', minWidth: 200, flex: 1 },
    { field: 'adjustment', headerName: 'Adjustment Qty', width: 150,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
          {params.value > 0 ? `+${params.value}` : params.value}
        </Box>
      )
    },
    { field: 'unit', headerName: 'Unit', width: 100 },
    { field: 'reason', headerName: 'Reason', minWidth: 150, flex: 1 },
    { field: 'approvedBy', headerName: 'Approved By', width: 150 },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>New Stock Adjustment</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: '1 1 200px', minWidth: 150 }}>
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
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: 150 }}>
            <TextField 
              fullWidth 
              label="Quantity" 
              type="number" 
              size="small"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              helperText="E.g. -5 to deduct, 10 to add"
            />
          </Box>
          <Box sx={{ flex: '2 1 300px', minWidth: 200 }}>
            <TextField 
              fullWidth 
              label="Reason" 
              size="small"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Box>
          <Box sx={{ flex: '0 1 150px', minWidth: 120 }}>
            <Button 
              variant="contained" 
              fullWidth 
              startIcon={<Add />} 
              onClick={handleSubmit}
              disabled={loading}
              sx={{ height: 40 }}
            >
              Submit
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography variant="h6" gutterBottom>Adjustment History</Typography>
        <Box sx={{ flexGrow: 1, minHeight: 300 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            autoHeight
            disableRowSelectionOnClick
            disableColumnVirtualization
            sx={{
              '& .MuiDataGrid-columnHeader[data-field="product"], & .MuiDataGrid-cell[data-field="product"]': {
                position: 'sticky',
                left: 0,
                zIndex: 1,
                backgroundColor: 'background.paper',
                boxShadow: (theme) => theme.palette.mode === 'light' ? '2px 0 4px -2px rgba(0,0,0,0.2)' : '2px 0 4px -2px rgba(0,0,0,0.5)'
              },
              '& .MuiDataGrid-columnHeader[data-field="product"]': {
                zIndex: 2,
              }
            }}
          />
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

export default StockAdjustments;
