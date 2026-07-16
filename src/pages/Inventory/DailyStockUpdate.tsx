import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, Chip, TextField, InputAdornment, Snackbar, Alert } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import { Save, ExpandMore, Search, Download } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import type { DailyInventory } from '../../types';
import { InventoryStatus } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

interface StockRow extends DailyInventory {
  productName: string;
  categoryName: string;
  unit: string;
}



const DailyStockUpdate: React.FC = () => {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      let query = supabase.from('products').select('*, categories(name)').eq('is_active', true).order('name');
      
      if (user?.role !== 'Super Admin' && user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (data) {
        const mappedRows = data.map(p => ({
          id: p.id,
          product_id: p.id,
          productName: p.name,
          categoryName: (p.categories as any)?.name || 'Uncategorized',
          unit: p.unit || 'Unit',
          openingStock: 0,
          purchase: 0,
          consumption: 0,
          waste: 0,
          closingStock: 0,
          status: InventoryStatus.DRAFT,
          date: new Date().toISOString()
        }));
        setRows(mappedRows);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRowUpdate = (newRow: StockRow, _oldRow: StockRow) => {
    // Formula: Closing = Opening + Purchase - Consumption - Waste
    const closingStock = Number(newRow.openingStock) + Number(newRow.purchase) - Number(newRow.consumption) - Number(newRow.waste);
    const updatedRow = { ...newRow, closingStock };
    setRows(prevRows => prevRows.map((r) => (r.id === newRow.id ? updatedRow : r)));
    
    // Mark that we have unsaved changes if any values were actually changed
    if (newRow.purchase !== _oldRow.purchase || newRow.consumption !== _oldRow.consumption || newRow.waste !== _oldRow.waste) {
      setHasUnsavedChanges(true);
    }
    
    return updatedRow;
  };

  const exportToExcel = () => {
    // Format rows for Excel
    const excelData = rows.map(r => ({
      'Category': r.categoryName,
      'Product Code': r.product_id, // We don't have code in this view, but product_id serves as unique id
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
    
    // Generate file and download
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Daily_Stock_Update_${dateStr}.xlsx`);
  };

  const handleSubmit = async () => {
    if (!user?.outletId) {
      setSnackbar({ open: true, message: "You must be assigned to an Outlet to submit inventory.", severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      
      // Filter rows that actually have data entered
      const payloads = rows
        .filter(r => r.purchase > 0 || r.consumption > 0 || r.waste > 0 || r.closingStock > 0)
        .map(r => ({
          date: dateStr,
          outlet_id: user.outletId,
          product_id: r.product_id,
          opening_stock: r.openingStock,
          purchase: r.purchase,
          consumption: r.consumption,
          waste: r.waste,
          closing_stock: r.closingStock,
          status: InventoryStatus.SUBMITTED
        }));

      if (payloads.length === 0) {
        setSnackbar({ open: true, message: "Please enter some stock data before submitting.", severity: 'error' });
        setSubmitting(false);
        return;
      }

      // Upsert into daily_stock
      const { error } = await supabase
        .from('daily_stock')
        .upsert(payloads, { onConflict: 'date, outlet_id, product_id' });
      
      if (error) throw error;
      
      // Update live inventory table as well
      const inventoryPayloads = payloads.map(p => ({
        outlet_id: p.outlet_id,
        product_id: p.product_id,
        current_quantity: p.closing_stock
      }));

      const { error: invErr } = await supabase
        .from('inventory')
        .upsert(inventoryPayloads, { onConflict: 'outlet_id, product_id' });
          
      if (invErr) throw invErr;

      setHasUnsavedChanges(false);
      setSnackbar({ open: true, message: "Inventory submitted successfully!", severity: 'success' });
    } catch (err: any) {
      console.error("Error submitting inventory", err);
      setSnackbar({ open: true, message: 'Failed to submit inventory: ' + err.message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'productName', headerName: 'Product', flex: 1, minWidth: 200 },
    { field: 'unit', headerName: 'Unit', width: 80 },
    { field: 'openingStock', headerName: 'Opening Stock', width: 130, type: 'number' },
    { field: 'purchase', headerName: 'Purchase (+)', width: 130, type: 'number', editable: true, 
      cellClassName: 'editable-cell' },
    { field: 'consumption', headerName: 'Consumption (-)', width: 140, type: 'number', editable: true,
      cellClassName: 'editable-cell' },
    { field: 'waste', headerName: 'Waste (-)', width: 100, type: 'number', editable: true,
      cellClassName: 'editable-cell' },
    { field: 'closingStock', headerName: 'Closing Stock', width: 130, type: 'number',
      renderCell: (params: any) => (
        <Box sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {params.value}
        </Box>
      )
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        gap: 2,
        mb: 2 
      }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Daily Stock Update - {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" color="primary" startIcon={<Download />} onClick={exportToExcel}>
            Export to Excel
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Save />} 
            onClick={handleSubmit}
            disabled={submitting || !hasUnsavedChanges}
          >
            {submitting ? 'Submitting...' : 'Submit Inventory'}
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
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

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
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
                <Typography variant="h6">{category} <Chip label={catRows.length} size="small" sx={{ ml: 1 }} /></Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <DataGrid
                    rows={catRows}
                    columns={columns}
                    processRowUpdate={handleProcessRowUpdate}
                    autoHeight
                    hideFooter
                    disableRowSelectionOnClick
                    sx={{
                      border: 'none',
                      minWidth: 800,
                      '& .MuiDataGrid-cell.editable-cell': {
                        backgroundColor: (theme) => theme.palette.mode === 'light' ? '#f0fdf4' : 'rgba(34, 197, 94, 0.1)',
                        '&:hover': {
                          cursor: 'pointer'
                        }
                      }
                    }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', boxShadow: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DailyStockUpdate;
