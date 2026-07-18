import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Button, Typography, Accordion, AccordionSummary, AccordionDetails,
  Chip, TextField, InputAdornment, useTheme, ToggleButtonGroup, ToggleButton,
  Card, CardContent, Tooltip, Alert
} from '@mui/material';
import { Save, ExpandMore, Search, Download, ViewList, GridView } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import type { DailyInventory } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useFeedback } from '../../hooks/useFeedback';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { InventoryStatus } from '../../constants';
import { getScopedCompanyId } from '../../lib/tenantScope';

interface StockRow extends DailyInventory {
  productName: string;
  categoryName: string;
  unit: string;
}

type ViewMode = 'list' | 'card';

interface DraftEntry {
  product_id: string;
  purchase: number;
  consumption: number;
  waste: number;
  closingStock: number;
}

interface DailyStockDraft {
  outletId: string;
  date: string;
  savedAt: string;
  entries: DraftEntry[];
}

const DRAFT_PREFIX = 'cafepilots_daily_stock_draft:';
const DRAFT_SAVE_MS = 400;

/** Local calendar date (avoids UTC midnight shifting the working day). */
function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function draftKey(outletId: string, dateStr: string) {
  return `${DRAFT_PREFIX}${outletId}:${dateStr}`;
}

function loadDraft(outletId: string, dateStr: string): DailyStockDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(outletId, dateStr));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyStockDraft;
    if (!parsed?.outletId || !parsed?.date || !Array.isArray(parsed.entries)) return null;
    if (parsed.outletId !== outletId || parsed.date !== dateStr) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(outletId: string, dateStr: string, rows: StockRow[]) {
  const draft: DailyStockDraft = {
    outletId,
    date: dateStr,
    savedAt: new Date().toISOString(),
    entries: rows
      .filter((r) => r.purchase > 0 || r.consumption > 0 || r.waste > 0)
      .map((r) => ({
        product_id: r.product_id,
        purchase: r.purchase,
        consumption: r.consumption,
        waste: r.waste,
        closingStock: r.closingStock,
      })),
  };
  localStorage.setItem(draftKey(outletId, dateStr), JSON.stringify(draft));
}

function clearDraft(outletId: string, dateStr: string) {
  localStorage.removeItem(draftKey(outletId, dateStr));
}

function applyDraftToRows(rows: StockRow[], draft: DailyStockDraft): StockRow[] {
  const byProduct = new Map(draft.entries.map((e) => [e.product_id, e]));
  return rows.map((row) => {
    const entry = byProduct.get(row.product_id);
    if (!entry) return row;
    return {
      ...row,
      purchase: entry.purchase,
      consumption: entry.consumption,
      waste: entry.waste,
      closingStock:
        Number(row.openingStock) +
        Number(entry.purchase) -
        Number(entry.consumption) -
        Number(entry.waste),
      status: InventoryStatus.IN_PROGRESS,
    };
  });
}

const DailyStockUpdate: React.FC = () => {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const { showFeedback, FeedbackComponent } = useFeedback();
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsRef = useRef<StockRow[]>([]);
  const outletRef = useRef(selectedOutlet);
  const dirtyRef = useRef(false);

  rowsRef.current = rows;
  outletRef.current = selectedOutlet;
  dirtyRef.current = hasUnsavedChanges;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  // Persist latest draft when leaving the page (in-app navigation / unmount)
  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (dirtyRef.current && outletRef.current) {
        saveDraft(outletRef.current, getLocalDateStr(), rowsRef.current);
      }
    };
  }, []);

  const scheduleDraftSave = useCallback((nextRows: StockRow[], outletId: string) => {
    if (!outletId) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const dateStr = getLocalDateStr();
      saveDraft(outletId, dateStr, nextRows);
      setLastDraftSavedAt(new Date().toLocaleTimeString());
    }, DRAFT_SAVE_MS);
  }, []);

  const handleRowChange = useCallback((updatedRow: StockRow) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === updatedRow.id ? updatedRow : r));
      scheduleDraftSave(next, outletRef.current);
      return next;
    });
    setHasUnsavedChanges(true);
  }, [scheduleDraftSave]);

  useEffect(() => {
    if (user?.role === 'Super Admin' || user?.role === 'Admin') {
      fetchOutlets();
    } else if (user?.outletId) {
      setSelectedOutlet(user.outletId);
    }
  }, [user]);

  useEffect(() => {
    if (selectedOutlet) {
      fetchDailyData(selectedOutlet);
    } else {
      setLoading(false);
    }
  }, [selectedOutlet]);

  const fetchOutlets = async () => {
    try {
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('outlets').select('id, name').eq('is_active', true);
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) {
        setOutlets(data);
        if (!selectedOutlet) {
          setSelectedOutlet(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  };

  const fetchDailyData = async (outletId: string) => {
    try {
      setLoading(true);
      setDraftRestoredAt(null);
      const companyId = getScopedCompanyId(user);
      let pQuery = supabase.from('products').select('*, categories(name)').eq('is_active', true).order('name');
      if (companyId) pQuery = pQuery.eq('company_id', companyId);
      const { data: productsData, error: pErr } = await pQuery;
      if (pErr) throw pErr;

      const invMap: Record<string, number> = {};
      if (outletId) {
        const { data: invData } = await supabase.from('inventory').select('product_id, current_quantity').eq('outlet_id', outletId);
        if (invData) {
          invData.forEach(item => { invMap[item.product_id] = Number(item.current_quantity); });
        }
      }

      const dateStr = getLocalDateStr();
      const dailyMap: Record<string, any> = {};
      if (outletId) {
        const { data: dailyData } = await supabase.from('daily_stock').select('*').eq('outlet_id', outletId).eq('date', dateStr);
        if (dailyData) {
          dailyData.forEach(item => { dailyMap[item.product_id] = item; });
        }
      }

      if (productsData) {
        let mappedRows = productsData.map(p => {
          const daily = dailyMap[p.id];
          const opening = daily ? Number(daily.opening_stock) : (invMap[p.id] || 0);
          const pur = daily ? Number(daily.purchase) : 0;
          const con = daily ? Number(daily.consumption) : 0;
          const was = daily ? Number(daily.waste) : 0;
          const clos = daily ? Number(daily.closing_stock) : opening;

          return {
            id: p.id,
            product_id: p.id,
            productName: p.name,
            categoryName: (p.categories as any)?.name || 'Uncategorized',
            unit: p.unit || 'Unit',
            openingStock: opening,
            purchase: pur,
            consumption: con,
            waste: was,
            closingStock: clos,
            status: daily ? daily.status : InventoryStatus.IN_PROGRESS,
            date: dateStr
          };
        });

        const draft = loadDraft(outletId, dateStr);
        if (draft && draft.entries.length > 0) {
          mappedRows = applyDraftToRows(mappedRows, draft);
          setHasUnsavedChanges(true);
          setDraftRestoredAt(new Date(draft.savedAt).toLocaleString());
          setLastDraftSavedAt(new Date(draft.savedAt).toLocaleTimeString());
        } else {
          setHasUnsavedChanges(false);
          setLastDraftSavedAt(null);
        }

        setRows(mappedRows);
      }
    } catch (error) {
      console.error('Error fetching daily data:', error);
      showFeedback('Error loading inventory data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOutletChange = (nextOutlet: string) => {
    if (nextOutlet === selectedOutlet) return;
    if (hasUnsavedChanges) {
      const ok = window.confirm(
        'You have unsaved daily stock entries for this outlet. Switch outlet? Your draft for the current outlet stays on this device.'
      );
      if (!ok) return;
      if (selectedOutlet) {
        saveDraft(selectedOutlet, getLocalDateStr(), rowsRef.current);
      }
    }
    setSelectedOutlet(nextOutlet);
  };

  const exportToExcel = () => {
    const excelData = rows.map(r => ({
      'Category': r.categoryName,
      'Product Name': r.productName,
      'Unit': r.unit,
      'Opening Stock': r.openingStock,
      'Purchase (+)': r.purchase,
      'Consumption (-)': r.consumption,
      'Waste (-)': r.waste,
      'Closing Stock': r.closingStock
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Stock');

    const dateStr = getLocalDateStr();
    XLSX.writeFile(workbook, `Daily_Stock_Update_${dateStr}.xlsx`);
  };

  const handleSaveDraft = () => {
    if (!selectedOutlet) {
      showFeedback('Please select an outlet first.', 'error');
      return;
    }
    const dateStr = getLocalDateStr();
    saveDraft(selectedOutlet, dateStr, rows);
    setLastDraftSavedAt(new Date().toLocaleTimeString());
    setHasUnsavedChanges(true);
    showFeedback('Draft saved on this device. You can continue later without losing entries.', 'success');
  };

  const handleSubmit = async () => {
    if (!selectedOutlet) {
      showFeedback("Please select an outlet first.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = getLocalDateStr();

      const payloads = rows
        .filter(r => r.purchase > 0 || r.consumption > 0 || r.waste > 0 || r.closingStock > 0)
        .map(r => ({
          date: dateStr,
          outlet_id: selectedOutlet,
          product_id: r.product_id,
          opening_stock: r.openingStock,
          purchase: r.purchase,
          consumption: r.consumption,
          waste: r.waste,
          closing_stock: r.closingStock,
          status: InventoryStatus.SUBMITTED
        }));

      if (payloads.length === 0) {
        showFeedback("Please enter some stock data before submitting.", "error");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('daily_stock')
        .upsert(payloads, { onConflict: 'date, outlet_id, product_id' });

      if (error) throw error;

      const inventoryPayloads = payloads.map(p => ({
        outlet_id: p.outlet_id,
        product_id: p.product_id,
        current_quantity: p.closing_stock
      }));

      const { error: invErr } = await supabase
        .from('inventory')
        .upsert(inventoryPayloads, { onConflict: 'outlet_id, product_id' });

      if (invErr) throw invErr;

      clearDraft(selectedOutlet, dateStr);
      setHasUnsavedChanges(false);
      setDraftRestoredAt(null);
      setLastDraftSavedAt(null);
      showFeedback("Inventory submitted successfully!", "success");
    } catch (err: any) {
      console.error("Error submitting inventory", err);
      if (selectedOutlet) {
        saveDraft(selectedOutlet, getLocalDateStr(), rowsRef.current);
        setLastDraftSavedAt(new Date().toLocaleTimeString());
      }
      showFeedback('Failed to submit inventory: ' + err.message + ' Your entries were kept as a local draft.', "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
          Daily Stock Update – {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Typography>

        {draftRestoredAt && (
          <Alert severity="info" onClose={() => setDraftRestoredAt(null)}>
            Restored unsaved draft from {draftRestoredAt}. Submit when ready, or keep editing — changes auto-save on this device.
          </Alert>
        )}

        {hasUnsavedChanges && lastDraftSavedAt && !draftRestoredAt && (
          <Typography variant="caption" color="text.secondary">
            Draft auto-saved locally at {lastDraftSavedAt}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1.5, alignItems: 'center' }}>
          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
            <FormControl
              size="small"
              sx={{ minWidth: 0, flex: '1 1 auto' }}
            >
              <InputLabel id="outlet-select-label">Select Outlet</InputLabel>
              <Select
                labelId="outlet-select-label"
                value={selectedOutlet}
                label="Select Outlet"
                onChange={(e: any) => handleOutletChange(e.target.value as string)}
              >
                {outlets.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="outlined"
            color="primary"
            startIcon={<Download />}
            onClick={exportToExcel}
            sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Export to Excel
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Save />}
            onClick={handleSaveDraft}
            disabled={!hasUnsavedChanges && !lastDraftSavedAt}
            sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Save Draft
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<Save />}
            onClick={handleSubmit}
            disabled={submitting || !hasUnsavedChanges}
            sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {submitting ? 'Submitting…' : 'Submit Inventory'}
          </Button>

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

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }
          }}
          sx={{ bgcolor: 'background.paper' }}
        />
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: { xs: 9, sm: 0 } }}>
        {loading ? (
          <Typography sx={{ p: 2 }}>Loading products...</Typography>
        ) : (
          Object.entries(
            rows
              .filter(row => row.productName.toLowerCase().includes(searchQuery.toLowerCase()))
              .reduce((acc, row) => {
                const category = row.categoryName;
                if (!acc[category]) acc[category] = [];
                acc[category].push(row);
                return acc;
              }, {} as Record<string, StockRow[]>)
          ).map(([category, catRows]) => (
            <Accordion key={category} defaultExpanded sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'background.default' }}>
                <Typography variant="h6">
                  {category} <Chip label={catRows.length} size="small" sx={{ ml: 1 }} />
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: viewMode === 'card' ? 2 : 0 }}>
                {viewMode === 'list' ? (
                  <StockTable
                    catRows={catRows}
                    onRowChange={handleRowChange}
                  />
                ) : (
                  <StockCardGrid
                    catRows={catRows}
                    onRowChange={handleRowChange}
                  />
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {FeedbackComponent}

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
          gap: 1.5,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.10)',
        }}
      >
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<Save />}
          onClick={handleSaveDraft}
          disabled={!hasUnsavedChanges && !lastDraftSavedAt}
          fullWidth
          sx={{ whiteSpace: 'nowrap' }}
        >
          Draft
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={submitting || !hasUnsavedChanges}
          fullWidth
          sx={{ whiteSpace: 'nowrap' }}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </Box>
    </Box>
  );
};


// ────────────────────────────────────────────
// Sticky-column table sub-component
// ────────────────────────────────────────────
interface StockTableProps {
  catRows: StockRow[];
  onRowChange: (row: StockRow) => void;
}

const StockTable: React.FC<StockTableProps> = ({ catRows, onRowChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const altBg = isDark ? '#242424' : '#fafafa';
  const editBg = isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4';
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const headerBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const textColor = isDark ? '#ffffff' : '#111111';

  const handleChange = (
    row: StockRow,
    field: 'purchase' | 'consumption' | 'waste',
    value: string
  ) => {
    const num = parseFloat(value) || 0;
    const updated = { ...row, [field]: num };
    updated.closingStock =
      Number(updated.openingStock) +
      Number(updated.purchase) -
      Number(updated.consumption) -
      Number(updated.waste);
    onRowChange(updated);
  };

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
    minWidth: 150,
    maxWidth: 220,
    boxShadow: isDark
      ? '3px 0 8px rgba(0,0,0,0.6)'
      : '3px 0 8px rgba(0,0,0,0.08)',
  };

  const input: React.CSSProperties = {
    width: 88,
    padding: '5px 8px',
    fontSize: '0.85rem',
    borderRadius: 6,
    border: `1px solid ${borderColor}`,
    backgroundColor: editBg,
    color: textColor,
    textAlign: 'center',
    outline: 'none',
    appearance: 'textfield' as any,
  };

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr style={{ backgroundColor: headerBg }}>
            <th style={{ ...sticky, backgroundColor: headerBg, zIndex: 3, fontWeight: 700 }}>Product</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'center', backgroundColor: headerBg }}>Unit</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'right', backgroundColor: headerBg }}>Opening Stock</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'center', color: '#16a34a', backgroundColor: editBg }}>Purchase (+)</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'center', color: '#16a34a', backgroundColor: editBg }}>Consumption (−)</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'center', color: '#16a34a', backgroundColor: editBg }}>Waste (−)</th>
            <th style={{ ...cell, fontWeight: 700, textAlign: 'right', backgroundColor: headerBg }}>Closing Stock</th>
          </tr>
        </thead>
        <tbody>
          {catRows.map((row, i) => {
            const rowBg = i % 2 === 0 ? bg : altBg;
            return (
              <tr key={row.id} style={{ backgroundColor: rowBg }}>
                <td style={{ ...sticky, backgroundColor: rowBg }}>{row.productName}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{row.unit}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{row.openingStock}</td>
                <td style={{ ...cell, textAlign: 'center', backgroundColor: editBg }}>
                  <input
                    type="number"
                    style={input}
                    value={row.purchase}
                    onChange={(e) => handleChange(row, 'purchase', e.target.value)}
                  />
                </td>
                <td style={{ ...cell, textAlign: 'center', backgroundColor: editBg }}>
                  <input
                    type="number"
                    style={input}
                    value={row.consumption}
                    onChange={(e) => handleChange(row, 'consumption', e.target.value)}
                  />
                </td>
                <td style={{ ...cell, textAlign: 'center', backgroundColor: editBg }}>
                  <input
                    type="number"
                    style={input}
                    value={row.waste}
                    onChange={(e) => handleChange(row, 'waste', e.target.value)}
                  />
                </td>
                <td style={{ ...cell, textAlign: 'right', fontWeight: 'bold', color: '#FF6A00' }}>
                  {row.closingStock}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Box>
  );
};


// ────────────────────────────────────────────────────────────
// Card Grid view for Daily Stock Update
// ────────────────────────────────────────────────────────────
interface StockCardGridProps {
  catRows: StockRow[];
  onRowChange: (row: StockRow) => void;
}

const StockCardGrid: React.FC<StockCardGridProps> = ({ catRows, onRowChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const editBg = isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4';
  const borderColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const textColor = isDark ? '#fff' : '#111';

  const handleChange = (
    row: StockRow,
    field: 'purchase' | 'consumption' | 'waste',
    value: string
  ) => {
    const num = parseFloat(value) || 0;
    const updated = { ...row, [field]: num };
    updated.closingStock =
      Number(updated.openingStock) +
      Number(updated.purchase) -
      Number(updated.consumption) -
      Number(updated.waste);
    onRowChange(updated);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    fontSize: '0.9rem',
    borderRadius: 6,
    border: `1px solid ${borderColor}`,
    backgroundColor: editBg,
    color: textColor,
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
    marginBottom: 3,
  };

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' },
      gap: 2,
    }}>
      {catRows.map((row) => (
        <Card
          key={row.id}
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: theme.shadows[3] },
          }}
        >
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            {/* Product Name */}
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3, minHeight: 32, fontSize: '0.8rem' }}
            >
              {row.productName}
            </Typography>

            {/* Opening stock badge */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Opening</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {row.openingStock} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{row.unit}</span>
              </Typography>
            </Box>

            {/* Editable fields */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <div>
                <div style={labelStyle}>Purchase (+)</div>
                <input
                  type="number"
                  style={inputStyle}
                  value={row.purchase}
                  onChange={(e) => handleChange(row, 'purchase', e.target.value)}
                />
              </div>
              <div>
                <div style={labelStyle}>Consumed (−)</div>
                <input
                  type="number"
                  style={inputStyle}
                  value={row.consumption}
                  onChange={(e) => handleChange(row, 'consumption', e.target.value)}
                />
              </div>
              <div>
                <div style={labelStyle}>Waste (−)</div>
                <input
                  type="number"
                  style={inputStyle}
                  value={row.waste}
                  onChange={(e) => handleChange(row, 'waste', e.target.value)}
                />
              </div>
            </Box>

            {/* Closing stock */}
            <Box sx={{
              mt: 1.5, pt: 1, borderTop: `1px solid ${borderColor}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Closing</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#FF6A00', fontSize: '1.1rem' }}>
                {row.closingStock}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default DailyStockUpdate;
