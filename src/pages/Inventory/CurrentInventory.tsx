import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Chip, FormControl, InputLabel, Select, MenuItem,
  Accordion, AccordionSummary, AccordionDetails, Typography,
  Button, TextField, InputAdornment, ToggleButtonGroup,
  ToggleButton, Card, CardContent, Tooltip, useTheme
} from '@mui/material';
import { ExpandMore, Download, Search, ViewList, GridView } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useFeedback } from '../../hooks/useFeedback';
import { getScopedCompanyId, getOutletIdsForCompany } from '../../lib/tenantScope';
import { PERMISSIONS } from '../../constants/permissions';
import { useHasPermission } from '../../hooks/useHasPermission';

type ViewMode = 'list' | 'card';

const CurrentInventory: React.FC = () => {
  const { user } = useAuthStore();
  const canSwitchBranches = useHasPermission(PERMISSIONS.BRANCH_SWITCH);
  const { showFeedback, FeedbackComponent } = useFeedback();
  const [inventory, setInventory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const fetchOutlets = async () => {
    try {
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('outlets').select('id, name');
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      if (data) setOutlets(data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  };

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const companyId = getScopedCompanyId(user);
      let query = supabase
        .from('products')
        .select('id, code, name, category_id, unit, min_stock, max_stock, is_active, categories(name)')
        .order('name');
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const companyOutletIds = getOutletIdsForCompany(companyId);
        let invQuery = supabase.from('inventory').select('product_id, current_quantity');
        if (selectedOutlet && selectedOutlet !== 'all') {
          invQuery = invQuery.eq('outlet_id', selectedOutlet);
        } else if (companyOutletIds.length > 0) {
          invQuery = invQuery.in('outlet_id', companyOutletIds);
        }

        const { data: invData, error: invErr } = await invQuery;
        if (invErr) throw invErr;

        const invMap: Record<string, { qty: number }> = {};
        if (invData) {
          invData.forEach(item => {
            if (!invMap[item.product_id]) invMap[item.product_id] = { qty: 0 };
            invMap[item.product_id].qty += Number(item.current_quantity) || 0;
          });
        }

        const mapped = data.map(p => {
          const qty = invMap[p.id]?.qty ?? 0;
          const min = p.min_stock || 10;
          return {
            id: p.id,
            productCode: p.code,
            productName: p.name,
            category: (p.categories as any)?.name || 'Uncategorized',
            quantity: qty,
            unit: p.unit || 'Unit',
            minStock: min,
            status: qty < min ? 'Low Stock' : 'Optimal',
            lastUpdated: new Date().toISOString()
          };
        });
        setInventory(mapped);
      }
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      showFeedback('Failed to load live inventory: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet]);

  useEffect(() => {
    if (canSwitchBranches) {
      fetchOutlets();
    } else if (user?.outletId) {
      setSelectedOutlet(user.outletId);
    }
  }, [canSwitchBranches, user]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const exportToExcel = () => {
    const excelData = inventory.map(item => ({
      'Category': item.category,
      'Product Code': item.productCode,
      'Product Name': item.productName,
      'Live Inventory': item.quantity,
      'Unit': item.unit,
      'Min Stock': item.minStock,
      'Status': item.quantity < item.minStock ? 'Low Stock' : 'Optimal',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Live Inventory');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Current_Stock_${dateStr}.xlsx`);
  };

  const filteredInventory = inventory.filter(item =>
    (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.productCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filteredInventory.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
          Live Inventory Status
        </Typography>

        {/* Row 1: Search (full width on mobile) */}
        <TextField
          placeholder="Search products..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
            ),
          }}
        />

        {/* Row 2: Export (desktop only) + Outlet + Toggle — all in one row */}
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="outlined" color="primary"
            startIcon={<Download />} onClick={exportToExcel}
            sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Export to Excel
          </Button>

          {canSwitchBranches && (
            <FormControl size="small" sx={{ minWidth: 0, flex: '1 1 auto' }}>
              <InputLabel id="outlet-select-label">Select Outlet</InputLabel>
              <Select
                labelId="outlet-select-label"
                value={selectedOutlet}
                label="Select Outlet"
                onChange={(e: any) => setSelectedOutlet(e.target.value)}
              >
                <MenuItem value="all">All Outlets (Master List)</MenuItem>
                {outlets.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* View toggle — pinned right */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_e, val) => { if (val) setViewMode(val); }}
            size="small"
            sx={{ ml: { xs: 0, sm: 'auto' }, flexShrink: 0 }}
          >
            <ToggleButton value="list"><Tooltip title="List View"><ViewList /></Tooltip></ToggleButton>
            <ToggleButton value="card"><Tooltip title="Card View"><GridView /></Tooltip></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* ── Content ── */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: { xs: 9, sm: 0 } }}>
        {loading ? (
          <Typography sx={{ p: 2 }}>Loading inventory...</Typography>
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <Accordion key={category} defaultExpanded sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'background.default' }}>
                <Typography variant="h6">
                  {category} <Chip label={catItems.length} size="small" sx={{ ml: 1 }} />
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: viewMode === 'card' ? 2 : 0, overflow: 'visible' }}>
                {viewMode === 'list' ? (
                  <InventoryTable items={catItems} />
                ) : (
                  <InventoryCardGrid items={catItems} />
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {FeedbackComponent}

      {/* ── Sticky bottom bar (mobile only) ── */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          px: 2,
          py: 1.5,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.10)',
        }}
      >
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Download />}
          onClick={exportToExcel}
          fullWidth
          sx={{ whiteSpace: 'nowrap' }}
        >
          Export to Excel
        </Button>
      </Box>
    </Box>
  );
};

// ── Card Grid ──────────────────────────────────
const InventoryCardGrid: React.FC<{ items: any[] }> = ({ items }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' },
      gap: 2,
    }}>
      {items.map((item) => {
        const isLow = item.quantity < item.minStock;
        return (
          <Card
            key={item.id}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: isLow ? 'warning.light' : 'divider',
              borderRadius: 2,
              transition: 'box-shadow 0.2s, transform 0.2s',
              '&:hover': {
                boxShadow: theme.shadows[4],
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}
              >
                {item.productCode || '—'}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, mt: 0.25, mb: 1.5, lineHeight: 1.3, minHeight: 36 }}
              >
                {item.productName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 1 }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, color: isLow ? 'warning.main' : 'primary.main' }}
                >
                  {item.quantity}
                </Typography>
                <Typography variant="caption" color="text.secondary">{item.unit}</Typography>
              </Box>
              <Chip
                label={isLow ? 'Low Stock' : 'Optimal'}
                color={isLow ? 'warning' : 'success'}
                size="small"
                sx={{ width: '100%', fontWeight: 600 }}
              />
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default CurrentInventory;

// ────────────────────────────────────────────────────────────
// Sticky-column table for Live Inventory list view
// ────────────────────────────────────────────────────────────
const InventoryTable: React.FC<{ items: any[] }> = ({ items }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const altBg = isDark ? '#242424' : '#fafafa';
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const headerBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const textColor = isDark ? '#ffffff' : '#111111';

  const cell: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: `1px solid ${borderColor}`,
    whiteSpace: 'nowrap',
    fontSize: '0.85rem',
    verticalAlign: 'middle',
    color: textColor,
  };

  const sticky: React.CSSProperties = {
    ...cell,
    position: 'sticky',
    left: 0,
    zIndex: 2,
    fontWeight: 600,
    minWidth: 130,
    maxWidth: 210,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxShadow: isDark
      ? '3px 0 8px rgba(0,0,0,0.6)'
      : '3px 0 8px rgba(0,0,0,0.08)',
  };

  return (
    <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'visible' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr style={{ backgroundColor: headerBg }}>
            <th style={{ ...sticky, backgroundColor: headerBg, zIndex: 3, fontWeight: 700 }}>Product Name</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'center', backgroundColor: headerBg }}>Code</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'right', backgroundColor: headerBg }}>Live Stock</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'center', backgroundColor: headerBg }}>Status</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'right', backgroundColor: headerBg }}>Min Stock</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const rowBg = i % 2 === 0 ? bg : altBg;
            const isLow = item.quantity < item.minStock;
            return (
              <tr key={item.id} style={{ backgroundColor: rowBg }}>
                <td style={{ ...sticky, backgroundColor: rowBg }}>{item.productName}</td>
                <td style={{ ...cell, textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', fontSize: '0.78rem' }}>
                  {item.productCode || '—'}
                </td>
                <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>
                  {item.quantity} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{item.unit}</span>
                </td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: isLow
                      ? (isDark ? 'rgba(251,191,36,0.2)' : '#fef9c3')
                      : (isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7'),
                    color: isLow ? '#d97706' : '#16a34a',
                  }}>
                    {isLow ? 'Low Stock' : 'Optimal'}
                  </span>
                </td>
                <td style={{ ...cell, textAlign: 'right', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
                  {item.minStock} {item.unit}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Box>
  );
};
