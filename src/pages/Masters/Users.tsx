import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, MenuItem } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import DataTable from '../../components/DataTable';
import { Role } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const Users: React.FC = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [franchises, setFranchises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({ is_active: true });

  useEffect(() => {
    fetchUsers();
    fetchFranchises();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('users').select(`*, franchise:franchises(name)`).order('name');
      if (user?.role !== 'Super Admin' && user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        setUsers(data.map(u => ({...u, franchiseName: u.franchise?.name})));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFranchises = async () => {
    try {
      let query = supabase.from('franchises').select('id, name');
      if (user?.role !== 'Super Admin' && user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }
      const { data } = await query;
      if (data) setFranchises(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpen = (u?: any) => {
    if (u) {
      setFormData(u);
    } else {
      setFormData({ 
        role: Role.STAFF,
        is_active: true,
        company_id: user?.companyId === 'SYSTEM' ? null : user?.companyId,
        franchise_id: (user?.role === Role.FRANCHISE_OWNER || user?.role === Role.STORE_MANAGER) ? user?.franchiseId : ''
      });
    }
    setOpen(true);
  };

  const getAvailableRoles = () => {
    if (user?.role === Role.SUPER_ADMIN) return Object.values(Role);
    if (user?.role === Role.ADMIN) return [Role.ADMIN, Role.FRANCHISE_OWNER, Role.STORE_MANAGER, Role.STAFF];
    if (user?.role === Role.FRANCHISE_OWNER || user?.role === Role.STORE_MANAGER) return [Role.STORE_MANAGER, Role.STAFF];
    return [];
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = { ...formData };
      delete dataToSave.franchise;
      delete dataToSave.franchiseName;
      delete dataToSave.password; // Don't send the mock password to the DB
      
      if (dataToSave.id) {
        const { error } = await supabase.from('users').update(dataToSave).eq('id', dataToSave.id);
        if (error) throw error;
      } else {
        // Supabase public.users requires an ID since it usually syncs with auth.users
        dataToSave.id = uuidv4();
        const { error } = await supabase.from('users').insert([dataToSave]);
        if (error) throw error;
      }
      handleClose();
      fetchUsers();
    } catch (error: any) {
      console.error("Error saving user", error);
      alert("Error saving user: " + (error.message || JSON.stringify(error)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) fetchUsers();
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'role', headerName: 'Role', width: 150 },
    { field: 'franchiseName', headerName: 'Franchise', width: 180 },
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
          title="User Management" 
          columns={columns} 
          rows={users} 
          loading={loading} 
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
              Add User
            </Button>
          }
        />
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{formData.id ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField 
              fullWidth 
              label="Full Name" 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <TextField 
              fullWidth 
              label="Email" 
              type="email"
              value={formData.email || ''} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
            <TextField 
              fullWidth 
              label="Password" 
              type="password"
              placeholder="Leave blank to keep unchanged"
              value={formData.password || ''} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
            <TextField 
              select
              fullWidth 
              label="Role" 
              value={formData.role || ''} 
              onChange={e => setFormData({...formData, role: e.target.value})} 
            >
              {getAvailableRoles().map(r => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>
            <TextField 
              select
              fullWidth 
              label="Assign to Franchise" 
              value={formData.franchise_id || ''} 
              onChange={e => setFormData({...formData, franchise_id: e.target.value})} 
              disabled={user?.role === Role.FRANCHISE_OWNER || user?.role === Role.STORE_MANAGER}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {franchises.map(f => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
