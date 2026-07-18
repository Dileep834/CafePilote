import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getScopedCompanyId } from '../../lib/tenantScope';

const Suppliers: React.FC = () => {
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({ is_active: true });

  useEffect(() => {
    fetchSuppliers();
  }, [user]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('suppliers').select('*').order('name', { ascending: true });
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
        
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (supplier?: any) => {
    if (supplier) setFormData(supplier);
    else setFormData({ is_active: true });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({});
  };

  const handleSave = async () => {
    const companyId = getScopedCompanyId(user);
    if (!companyId) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        contact_name: formData.contact_name,
        phone: formData.phone,
        address: formData.address,
        is_active: formData.is_active,
        company_id: companyId,
      };

      if (formData.id) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert([payload]);
        if (error) throw error;
      }
      
      await fetchSuppliers();
      handleClose();
    } catch (err) {
      console.error('Error saving supplier:', err);
      alert('Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) throw error;
        await fetchSuppliers();
      } catch (err) {
        console.error('Error deleting supplier:', err);
        alert('Failed to delete supplier');
      }
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
        <DialogTitle>{formData.id ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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
