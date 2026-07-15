import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';



const StockAdjustments: React.FC = () => {
  const [rows] = useState([]);

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', width: 130 },
    { field: 'product', headerName: 'Product', flex: 1 },
    { field: 'adjustment', headerName: 'Adjustment Qty', width: 150 },
    { field: 'reason', headerName: 'Reason', flex: 1 },
    { field: 'approvedBy', headerName: 'Approved By', width: 150 },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>New Stock Adjustment</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 2fr auto' }, gap: 2, alignItems: 'center' }}>
          <TextField fullWidth label="Product" size="small" />
          <TextField fullWidth label="Quantity (Use +/-)" type="number" size="small" />
          <TextField fullWidth label="Reason" size="small" />
          <Button variant="contained" fullWidth startIcon={<Add />}>Submit</Button>
        </Box>
      </Paper>
      
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography variant="h6" gutterBottom>Adjustment History</Typography>
        <Box sx={{ flexGrow: 1, minHeight: 300 }}>
          <DataGrid rows={rows} columns={columns} sx={{ border: 'none' }} />
        </Box>
      </Paper>
    </Box>
  );
};

export default StockAdjustments;
