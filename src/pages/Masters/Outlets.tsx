import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useFeedback } from '../../hooks/useFeedback';
import { getScopedCompanyId } from '../../lib/tenantScope';
import { HQ_COMPANY_ID } from '../../constants';

const Outlets: React.FC = () => {
  const { user } = useAuthStore();
  const { showFeedback, FeedbackComponent } = useFeedback();
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({ is_active: true });

  useEffect(() => {
    fetchOutlets();
  }, [user]);

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('outlets').select('*').order('name');
      if (companyId) query = query.eq('company_id', companyId);
      
      const { data, error } = await query;
      if (error) throw error;
      if (data) setOutlets(data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (outlet?: any) => {
    if (outlet) {
      setFormData(outlet);
    } else {
      setFormData({ 
        code: `FRA-${Math.floor(100 + Math.random() * 900)}`,
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
        const { error } = await supabase.from('outlets').update(formData).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('outlets').insert([formData]);
        if (error) throw error;
      }
      handleClose();
      fetchOutlets();
    } catch (error) {
      console.error("Error saving outlet", error);
      showFeedback("Error saving outlet.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this outlet?")) {
      const { error } = await supabase.from('outlets').delete().eq('id', id);
      if (!error) fetchOutlets();
    }
  };

  const columns: GridColDef[] = [
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'name', headerName: 'Outlet Name', flex: 1, minWidth: 200 },
    { field: 'location', headerName: 'Location', flex: 1, minWidth: 250 },
    { 
      field: 'is_active', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params: any) => (
        <Chip label={params.value ? 'Active' : 'Inactive'} color={params.value ? 'success' : 'default'} size="small" />
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
          title="Outlet Management" 
          columns={columns} 
          rows={outlets} 
          loading={loading}
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
              Add Outlet
            </Button>
          }
        />
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{formData.id ? 'Edit Outlet' : 'Add New Outlet'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Outlet Code" 
                value={formData.code || ''} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Outlet Name" 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </Grid>
            <Grid xs={12}>
              <TextField 
                fullWidth 
                label="Location" 
                value={formData.location || ''} 
                onChange={e => setFormData({...formData, location: e.target.value})} 
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Outlet'}
          </Button>
        </DialogActions>
      </Dialog>
      {FeedbackComponent}
    </Box>
  );
};

export default Outlets;
