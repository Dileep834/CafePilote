import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { v4 as uuidv4 } from 'uuid';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({ is_active: true });

  useEffect(() => {
    // Mock DB fetch from localStorage
    const saved = localStorage.getItem('mock_suppliers');
    if (saved) {
      setSuppliers(JSON.parse(saved));
    } else {
      setSuppliers([
        { id: '1', name: 'Fresh Farms Inc', contact_name: 'John Doe', phone: '+91 9876543210', category: 'Vegetables', is_active: true },
        { id: '2', name: 'Metro Dairy', contact_name: 'Jane Smith', phone: '+91 9123456789', category: 'Dairy', is_active: true }
      ]);
    }
    setLoading(false);
  }, []);

  const saveToDb = (data: any[]) => {
    setSuppliers(data);
    localStorage.setItem('mock_suppliers', JSON.stringify(data));
  };

  const handleOpen = (supplier?: any) => {
    if (supplier) setFormData(supplier);
    else setFormData({ is_active: true, id: uuidv4() });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({});
  };

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      let updated;
      const exists = suppliers.find(s => s.id === formData.id);
      if (exists) {
        updated = suppliers.map(s => s.id === formData.id ? formData : s);
      } else {
        updated = [...suppliers, formData];
      }
      saveToDb(updated);
      setSaving(false);
      handleClose();
    }, 500);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      const updated = suppliers.filter(s => s.id !== id);
      saveToDb(updated);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Supplier / Vendor Name', flex: 1, minWidth: 200 },
    { field: 'category', headerName: 'Category supplied', width: 150 },
    { field: 'contact_name', headerName: 'Contact Person', width: 150 },
    { field: 'phone', headerName: 'Phone Number', width: 150 },
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1 }}>
        <DataTable 
          title="Supplier / Vendor Management" 
          columns={columns} 
          rows={suppliers} 
          loading={loading}
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
              Add Supplier
            </Button>
          }
        />
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{formData.name ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="Vendor Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
            <TextField fullWidth label="Category (e.g. Dairy, Meat, Packaging)" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
            <TextField fullWidth label="Contact Person" value={formData.contact_name || ''} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
            <TextField fullWidth label="Phone Number" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <TextField fullWidth label="Address / GST Info" multiline rows={2} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Supplier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Suppliers;
