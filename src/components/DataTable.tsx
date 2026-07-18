import React from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Box, Paper, Typography, useTheme, useMediaQuery } from '@mui/material';

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
    // Find key columns for compact display
    const nameCol = columns.find(c => c.flex || (c.minWidth && c.minWidth >= 150)) || columns[1] || columns[0];
    const codeCol = columns.find(c => c.field === 'code' || c.field === 'product_code' || c.headerName?.toLowerCase().includes('code'));
    const statusCol = columns.find(c => c.field === 'is_active' || c.field === 'status' || c.headerName?.toLowerCase() === 'status');
    const actionsCol = columns.find(c => c.field === 'actions');
    const secondaryCol = columns.find(c => c !== nameCol && c !== statusCol && c !== actionsCol && c !== codeCol && c.field !== 'id');

    return (
      <Box sx={{ width: '100%' }}>
        {title && (
          <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
            {action && <Box>{action}</Box>}
          </Box>
        )}
        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No rows to display.
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {rows.map((row, index) => {
            const makeParams = (col: GridColDef) => ({ id: row.id || index, field: col.field, value: row[col.field], row });
            const renderVal = (col: GridColDef) => col.renderCell
              ? col.renderCell(makeParams(col) as any)
              : col.valueFormatter
                ? col.valueFormatter(makeParams(col) as any)
                : (row[col.field] !== undefined && row[col.field] !== null ? String(row[col.field]) : '–');

            return (
              <Box
                key={row.id || index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.25,
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {/* Code badge */}
                {codeCol && (
                  <Box sx={{
                    minWidth: 52, textAlign: 'center',
                    px: 0.75, py: 0.25,
                    bgcolor: 'grey.100', borderRadius: 1,
                    flexShrink: 0,
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem', lineHeight: 1.2 }}>
                      {renderVal(codeCol)}
                    </Typography>
                  </Box>
                )}

                {/* Name + secondary */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {nameCol && (
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {renderVal(nameCol)}
                    </Typography>
                  )}
                  {secondaryCol && (
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {renderVal(secondaryCol)}
                    </Typography>
                  )}
                </Box>

                {/* Status */}
                {statusCol && (
                  <Box sx={{ flexShrink: 0 }}>
                    {renderVal(statusCol)}
                  </Box>
                )}

                {/* Actions */}
                {actionsCol && (
                  <Box sx={{ flexShrink: 0, ml: -0.5 }}>
                    {renderVal(actionsCol)}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
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
