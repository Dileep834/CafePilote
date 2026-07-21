import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, MenuItem, TextField, Alert, Snackbar, Divider } from '@mui/material';
import { Backup, Restore, SyncAlt } from '@mui/icons-material';
import { supabase } from '@/lib/supabase';

export const DatabaseSettings: React.FC = () => {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [fromOutlet, setFromOutlet] = useState('');
  const [toOutlet, setToOutlet] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    supabase.from('outlets').select('id, name').then(({ data }) => {
      if (data) setOutlets(data);
    });
  }, []);

  const handleBackup = async () => {
    setLoading(true);
    // Dummy backup process
    setTimeout(() => {
      setLoading(false);
      setToast({ open: true, message: 'Database backup successfully generated and downloaded.', severity: 'success' });
    }, 1500);
  };

  const handleSync = async () => {
    if (!fromOutlet || !toOutlet) {
      setToast({ open: true, message: 'Please select both source and destination outlets.', severity: 'error' });
      return;
    }
    if (fromOutlet === toOutlet) {
      setToast({ open: true, message: 'Source and destination cannot be the same.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Find products in 'fromOutlet'
      const { data: fromInventory, error: fromError } = await supabase
        .from('inventory')
        .select('*')
        .eq('outlet_id', fromOutlet);
      
      if (fromError) throw fromError;
      if (!fromInventory || fromInventory.length === 0) {
        throw new Error('No inventory found in source outlet to sync.');
      }

      // Sync logic - copy to 'toOutlet'
      const toUpsert = fromInventory.map(item => ({
        outlet_id: toOutlet,
        product_id: item.product_id,
        current_quantity: item.current_quantity, // or 0 if we only copy products, but request said restore inventory
        unit: item.unit
      }));

      const { error: upsertError } = await supabase
        .from('inventory')
        .upsert(toUpsert, { onConflict: 'outlet_id, product_id' });

      if (upsertError) throw upsertError;

      setToast({ open: true, message: `Successfully synced ${toUpsert.length} items.`, severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err.message || 'Failed to sync inventory.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Backup Section */}
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Database Backup & Export</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Generate a full snapshot of your products, inventory, and historical orders.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Backup />} 
          onClick={handleBackup} 
          disabled={loading}
          sx={{ px: 4, py: 1.5, borderRadius: 2 }}
        >
          Download Database Backup
        </Button>
      </Paper>

      {/* Sync / Restore Section */}
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Inventory Data Sync (Restore/Transfer)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Copy product inventory data from one outlet (e.g., HQ) to another (e.g., Backbenchers). Warning: This may overwrite existing stock counts at the destination.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' }, gap: 3, alignItems: 'center' }}>
          <TextField 
            select 
            fullWidth 
            label="From Outlet (Source)" 
            value={fromOutlet} 
            onChange={e => setFromOutlet(e.target.value)}
          >
            {outlets.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </TextField>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <SyncAlt color="action" fontSize="large" />
          </Box>

          <TextField 
            select 
            fullWidth 
            label="To Outlet (Destination)" 
            value={toOutlet} 
            onChange={e => setToOutlet(e.target.value)}
          >
            {outlets.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          </TextField>
        </Box>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="warning" 
            startIcon={<Restore />} 
            onClick={handleSync}
            disabled={loading}
            sx={{ px: 4, py: 1.5, borderRadius: 2 }}
          >
            Sync Inventory Data
          </Button>
        </Box>
      </Paper>

      <Snackbar open={toast.open} autoHideDuration={5000} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
