import React from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Box, Paper, Typography, useTheme, useMediaQuery, Card, CardContent } from '@mui/material';

interface DataTableProps {
  title: string;
  columns: GridColDef[];
  rows: any[];
  onAdd?: () => void;
  loading?: boolean;
  action?: React.ReactNode;
}

const DataTable: React.FC<DataTableProps> = ({ title, columns, rows, onAdd, loading = false, action }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {action && <Box>{action}</Box>}
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No rows to display.
            </Typography>
          )}
          {rows.map((row, index) => (
            <Card key={row.id || index} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {columns.map(col => {
                  const params = {
                    id: row.id || index,
                    field: col.field,
                    value: row[col.field],
                    row: row
                  };
                  return (
                  <Box key={col.field} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px dashed', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ pr: 2 }}>
                      {col.headerName}
                    </Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      {col.renderCell ? col.renderCell(params as any) : (col.valueFormatter ? col.valueFormatter(params as any) : (row[col.field] !== undefined && row[col.field] !== null ? String(row[col.field]) : '-'))}
                    </Box>
                  </Box>
                )})}
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {action && <Box>{action}</Box>}
      </Box>
      <Box sx={{ flexGrow: 1, minHeight: 400, width: '100%', overflowX: 'auto' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            minWidth: 600,
            '& .MuiDataGrid-cell:focus': { outline: 'none' },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default DataTable;
