import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useFeedback } from '../../hooks/useFeedback';

const Categories: React.FC = () => {
  const { user } = useAuthStore();
  const { showFeedback, FeedbackComponent } = useFeedback();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      let query = supabase.from('categories').select('*').order('name');
      
      if (user?.role !== 'Super Admin' && user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      if (data) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (category?: any) => {
    if (category) {
      setFormData(category);
    } else {
      setFormData({ 
        company_id: user?.companyId === 'SYSTEM' ? null : user?.companyId
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
        const { error } = await supabase.from('categories').update(formData).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert([formData]);
        if (error) throw error;
      }
      handleClose();
      fetchCategories();
    } catch (error) {
      console.error("Error saving category", error);
      showFeedback("Error saving category.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) fetchCategories();
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Category Name', flex: 1 },
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
          title="Product Categories" 
          columns={columns} 
          rows={categories} 
          loading={loading}
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
              Add Category
            </Button>
          }
        />
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{formData.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 2 }}>
            <TextField 
              fullWidth 
              label="Category Name" 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      {FeedbackComponent}
    </Box>
  );
};

export default Categories;
