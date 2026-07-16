import React, { useState, useEffect } from 'react';
import { Box, Chip, FormControl, InputLabel, Select, MenuItem, Accordion, AccordionSummary, AccordionDetails, Typography, Button } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { ExpandMore, Download } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import DataTable from '../../components/DataTable';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const CurrentInventory: React.FC = () => {
  const { user } = useAuthStore();
  const [inventory, setInventory] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'Super Admin' || user?.role === 'Admin') {
      fetchOutlets();
    } else if (user?.outletId) {
      setSelectedOutlet(user.outletId);
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [selectedOutlet]);

  const fetchOutlets = async () => {
    try {
      const { data, error } = await supabase.from('outlets').select('id, name');
      if (error) throw error;
      if (data) setOutlets(data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      let query = supabase
        .from('products')
        .select('id, code, name, category_id, unit, min_stock, max_stock, is_active, categories(name)')
        .order('name');
        
      const { data, error } = await query;
      
      if (error) throw error;
      if (data) {
        // Map products to inventory format for MVP
        const mapped = data.map(p => ({
          id: p.id,
          productCode: p.code,
          productName: p.name,
          category: (p.categories as any)?.name || 'Uncategorized',
          quantity: 0,
          unit: p.unit || 'Unit',
          minStock: p.min_stock || 10,
          status: 'Low Stock',
          lastUpdated: new Date().toISOString()
        }));
        setInventory(mapped);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const excelData = inventory.map(item => ({
      'Category': item.category,
      'Product Code': item.productCode,
      'Product Name': item.productName,
      'Live Inventory': item.quantity,
      'Unit': item.unit,
      'Min Stock': item.minStock,
      'Status': item.quantity < item.minStock ? 'Low Stock' : 'Optimal',
      'Last Updated': item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Live Inventory');
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Current_Stock_${dateStr}.xlsx`);
  };

  const columns: GridColDef[] = [
    { field: 'productCode', headerName: 'Product Code', width: 120 },
    { field: 'productName', headerName: 'Product Name', width: 250 },
    { field: 'quantity', headerName: 'Live Inventory', width: 150, align: 'right', headerAlign: 'right',
      renderCell: (params: any) => (
        <Box sx={{ fontWeight: 'bold' }}>
          {params.value} {params.row.unit}
        </Box>
      )
    },
    { 
      field: 'status', 
      headerName: 'Stock Level', 
      width: 150,
      renderCell: (params: any) => {
        const qty = params.row.quantity;
        const isLow = qty < params.row.minStock;
        return (
          <Chip 
            label={isLow ? 'Low Stock' : 'Optimal'} 
            color={isLow ? 'warning' : 'success'} 
            size="small" 
          />
        );
      }
    },
    { 
      field: 'lastUpdated', 
      headerName: 'Last Updated', 
      width: 200,
      valueFormatter: (value: any) => value ? new Date(value).toLocaleString() : ""
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Live Inventory Status
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" color="primary" startIcon={<Download />} onClick={exportToExcel}>
            Export to Excel
          </Button>
          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
            <FormControl sx={{ minWidth: 250 }} size="small">
              <InputLabel id="outlet-select-label">Select Outlet</InputLabel>
              <Select
                labelId="outlet-select-label"
                value={selectedOutlet}
                label="Select Outlet"
                onChange={(e: SelectChangeEvent) => setSelectedOutlet(e.target.value)}
              >
                <MenuItem value="all">All Outlets (Master List)</MenuItem>
                {outlets.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {loading ? (
          <Typography sx={{ p: 2 }}>Loading inventory...</Typography>
        ) : (
          Object.entries(
            inventory.reduce((acc, item) => {
              const category = item.category || 'Uncategorized';
              if (!acc[category]) acc[category] = [];
              acc[category].push(item);
              return acc;
            }, {} as Record<string, any[]>)
          ).map(([category, catItems]) => (
            <Accordion key={category} defaultExpanded sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'background.default' }}>
                <Typography variant="h6">{category} <Chip label={catItems.length} size="small" sx={{ ml: 1 }} /></Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <DataTable 
                  title="" 
                  columns={columns} 
                  rows={catItems}
                />
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    </Box>
  );
};

export default CurrentInventory;
