import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import DataTable from '../../components/DataTable';
import { supabase } from '../../lib/supabase';
import { useFeedback } from '../../hooks/useFeedback';
import { PLAN_LIMITS, normalizePlanId, type SubscriptionPlanId } from '@/lib/planLimits';
import { useAuthStore } from '@/store/useAuthStore';
import { isSuperAdmin } from '@/lib/access';

const Companies: React.FC = () => {
  const { showFeedback, FeedbackComponent } = useFeedback();
  const user = useAuthStore((s) => s.user);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog State
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({ is_active: true });
  const canManageSubscriptions = isSuperAdmin(user);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*').order('name');
      if (error) throw error;
      let subscriptions = new Map<string, { plan_id?: string | null; status?: string | null }>();

      try {
        const ids = (data || []).map((company) => String(company.id));
        if (ids.length > 0) {
          const { data: subData, error: subError } = await supabase
            .from('company_subscriptions')
            .select('company_id, plan_id, status')
            .in('company_id', ids);
          if (subError) throw subError;
          subscriptions = new Map(
            (subData || []).map((sub: any) => [
              String(sub.company_id),
              { plan_id: sub.plan_id, status: sub.status },
            ])
          );
        }
      } catch (subscriptionError) {
        console.warn('Company subscriptions not available yet:', subscriptionError);
      }

      if (data) {
        setCompanies(
          data.map((company) => {
            const subscription = subscriptions.get(String(company.id));
            return {
              ...company,
              subscription_plan_id: normalizePlanId(subscription?.plan_id),
              subscription_status: subscription?.status || 'active',
            };
          })
        );
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (company?: any) => {
    if (company) {
      setFormData(company);
    } else {
      setFormData({ is_active: true });
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
        // Update
        const { error } = await supabase.from('companies').update({
          name: formData.name,
          subdomain: formData.subdomain,
          is_active: formData.is_active
        }).eq('id', formData.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from('companies').insert([{
          name: formData.name,
          subdomain: formData.subdomain,
          is_active: formData.is_active
        }]);
        if (error) throw error;
      }
      handleClose();
      fetchCompanies();
    } catch (error: any) {
      console.error("Error saving company", error);
      showFeedback("Error saving company: " + (error.message || JSON.stringify(error)), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this company? All associated data may be lost.")) {
      try {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) throw error;
        fetchCompanies();
      } catch (error: any) {
        console.error("Error deleting company", error);
        showFeedback("Cannot delete company. It may have associated records (Outlets, Users, etc).", "error");
      }
    }
  };

  const handlePlanChange = async (companyId: string, planId: SubscriptionPlanId) => {
    if (!canManageSubscriptions) return;
    const previous = companies;
    setCompanies((rows) =>
      rows.map((company) =>
        company.id === companyId
          ? { ...company, subscription_plan_id: planId, subscription_status: 'active' }
          : company
      )
    );

    try {
      const { error } = await supabase.from('company_subscriptions').upsert(
        {
          company_id: String(companyId),
          plan_id: planId,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
      if (error) throw error;
      showFeedback(`Subscription updated to ${PLAN_LIMITS[planId].label}.`, 'success');
    } catch (error: any) {
      setCompanies(previous);
      showFeedback(
        'Could not update subscription. Run ensure_hq_company.sql or saas_tenant_floor_patch.sql first.',
        'error'
      );
      console.error('Error updating subscription', error);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Company Name', flex: 1, minWidth: 200 },
    { field: 'subdomain', headerName: 'Subdomain', width: 200 },
    {
      field: 'subscription_plan_id',
      headerName: 'Subscription',
      width: 190,
      renderCell: (params: any) => (
        <TextField
          select
          size="small"
          value={normalizePlanId(params.value)}
          disabled={!canManageSubscriptions}
          onChange={(event) =>
            void handlePlanChange(params.row.id, event.target.value as SubscriptionPlanId)
          }
          sx={{ minWidth: 155 }}
        >
          {(Object.keys(PLAN_LIMITS) as SubscriptionPlanId[]).map((planId) => (
            <MenuItem key={planId} value={planId}>
              {PLAN_LIMITS[planId].label}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    {
      field: 'subscription_status',
      headerName: 'Billing',
      width: 120,
      renderCell: (params: any) => (
        <Chip
          label={params.value || 'active'}
          color={params.value === 'active' ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
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
    { field: 'created_at', headerName: 'Created On', width: 200, valueFormatter: (params: any) => new Date(params.value).toLocaleDateString() },
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
          title="Company Management" 
          columns={columns} 
          rows={companies} 
          loading={loading}
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
              Add Company
            </Button>
          }
        />
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{formData.id ? 'Edit Company' : 'Add New Company'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField 
              fullWidth 
              label="Company Name" 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <TextField 
              fullWidth 
              label="Subdomain (e.g., yourcompany)" 
              value={formData.subdomain || ''} 
              onChange={e => setFormData({...formData, subdomain: e.target.value})} 
              helperText="Used for customized login URLs (e.g. yourcompany.cafepilot.com)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Company'}
          </Button>
        </DialogActions>
      </Dialog>
      {FeedbackComponent}
    </Box>
  );
};

export default Companies;
