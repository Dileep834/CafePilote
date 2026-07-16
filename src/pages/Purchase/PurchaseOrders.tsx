import { formatCurrency } from '../../utils/format';
import React, { useState, useEffect } from 'react';
import { Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Typography, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Delete, Save } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const PurchaseOrders: React.FC = () => {
  const { user } = useAuthStore();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({ status: 'Draft' });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchPOs();
    fetchProducts();
  }, [user]);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      let query = supabase.from('purchase_orders').select('*').order('date', { ascending: false });
      if (user?.role !== 'Super Admin' && user?.companyId) {
        query = query.eq('outlet_id', user.companyId); // Assuming outlet_id maps to companyId for this demo
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) setPurchases(data);
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      let query = supabase.from('products').select('id, name, purchase_price, unit').eq('is_active', true).order('name');
      if (user?.role !== 'Super Admin' && user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleOpen = () => {
    setFormData({ 
      po_number: `PO-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth()+1).toString().padStart(2,'0')}-${Math.floor(100 + Math.random() * 900)}`,
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Draft',
      company_id: user?.companyId,
      outlet_id: user?.outletId
    });
    setItems([]);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        item.unit_price = product.purchase_price || 0;
      }
    }
    
    item.total = Number(item.quantity) * Number(item.unit_price);
    newItems[index] = item;
    setItems(newItems);
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  };

  const handleSave = async () => {
    if (!formData.vendor || items.length === 0) {
      alert("Please enter a vendor and at least one item.");
      return;
    }
    
    setSaving(true);
    try {
      const grandTotal = calculateGrandTotal();
      const poData = { ...formData, total_amount: grandTotal };
      
      // 1. Insert Purchase Order
      const { data: insertedPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert([poData])
        .select()
        .single();
        
      if (poError) throw poError;
      
      // 2. Insert PO Items
      if (insertedPO) {
        const poItems = items.map(item => ({
          po_id: insertedPO.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        }));
        
        const { error: itemsError } = await supabase.from('purchase_order_items').insert(poItems);
        if (itemsError) throw itemsError;
      }
      
      handleClose();
      fetchPOs();
    } catch (error: any) {
      console.error("Error saving PO", error);
      alert("Error saving Purchase Order: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'po_number', headerName: 'PO Number', width: 140 },
    { field: 'vendor', headerName: 'Vendor', flex: 1 },
    { field: 'date', headerName: 'Date', width: 130 },
    { 
      field: 'total_amount', 
      headerName: 'Total Amount', 
      width: 150,
      valueFormatter: (params: any) => `$${Number(params.value).toFixed(2)}`
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      renderCell: (params: any) => (
        <Chip 
          label={params.value} 
          color={params.value === 'Received' ? 'success' : params.value === 'Sent' ? 'primary' : 'default'} 
          size="small" 
        />
      )
    }
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
          New Purchase Order
        </Button>
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <DataTable title="Purchase Orders" columns={columns} rows={purchases} loading={loading} />
      </Box>

      {/* New Purchase Order Modal */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Purchase Order</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 4 }}>
            <TextField 
              fullWidth 
              label="PO Number" 
              value={formData.po_number || ''} 
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField 
              fullWidth 
              label="Date" 
              type="date"
              value={formData.date || ''} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField 
              fullWidth 
              label="Vendor / Supplier Name" 
              value={formData.vendor || ''} 
              onChange={e => setFormData({...formData, vendor: e.target.value})} 
            />
            <TextField 
              select
              fullWidth 
              label="Status" 
              value={formData.status || ''} 
              onChange={e => setFormData({...formData, status: e.target.value})} 
            >
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Sent">Sent</MenuItem>
              <MenuItem value="Received">Received</MenuItem>
            </TextField>
          </Box>

          <Typography variant="h6" sx={{ mb: 2 }}>Order Items</Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell width="120">Quantity</TableCell>
                  <TableCell width="120">Unit Price</TableCell>
                  <TableCell width="120">Total</TableCell>
                  <TableCell width="60"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No items added yet. Click "Add Item" below.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField 
                        select 
                        size="small" 
                        fullWidth 
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                      >
                        <MenuItem value=""><em>Select Product</em></MenuItem>
                        {products.map(p => (
                          <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField 
                        type="number" 
                        size="small" 
                        fullWidth 
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField 
                        type="number" 
                        size="small" 
                        fullWidth 
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      ${item.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <IconButton color="error" size="small" onClick={() => handleRemoveItem(index)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Button variant="outlined" startIcon={<Add />} onClick={handleAddItem}>
              Add Item
            </Button>
            <Typography variant="h6">
              Grand Total: ${calculateGrandTotal().toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Purchase Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseOrders;
