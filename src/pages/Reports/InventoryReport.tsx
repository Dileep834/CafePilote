import { formatCurrency } from '../../utils/format';
import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Tab, Tabs } from '@mui/material';
import { Download, Print } from '@mui/icons-material';
import type { GridColDef } from '@mui/x-data-grid';
import DataTable from '../../components/DataTable';

const mockReportData = [
  { id: '1', product: 'Espresso Beans', category: 'Beverages', stock: 45, value: 675.00, status: 'Optimal' },
  { id: '2', product: 'Whole Milk', category: 'Dairy', stock: 8, value: 12.00, status: 'Low Stock' },
];

const InventoryReport: React.FC = () => {
  const [tab, setTab] = useState(0);

  const columns: GridColDef[] = [
    { field: 'product', headerName: 'Product', flex: 1 },
    { field: 'category', headerName: 'Category', width: 150 },
    { field: 'stock', headerName: 'Live Inventory', width: 150, type: 'number' },
    { field: 'value', headerName: 'Valuation', width: 150, valueFormatter: (params: any) => `$${Number(params.value).toFixed(2)}` },
    { field: 'status', headerName: 'Status', width: 150 },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold" }}>Reports Hub</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Print />}>Print</Button>
          <Button variant="contained" startIcon={<Download />}>Export Excel</Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Inventory Valuation" />
          <Tab label="Purchase History" />
          <Tab label="Consumption & Waste" />
          <Tab label="Outlet Performance" />
        </Tabs>
      </Paper>

      <Box sx={{ flexGrow: 1 }}>
        <DataTable title="Inventory Valuation Report" columns={columns} rows={mockReportData} />
      </Box>
    </Box>
  );
};

export default InventoryReport;
