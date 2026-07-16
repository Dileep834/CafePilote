import { formatCurrency } from '../../utils/format';
import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Alert } from '@mui/material';
import { Inventory, Receipt, Warning, Assessment, CheckCircle } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', waste: 2, consumption: 24 },
  { name: 'Tue', waste: 1, consumption: 13 },
  { name: 'Wed', waste: 0, consumption: 98 },
  { name: 'Thu', waste: 3, consumption: 39 },
  { name: 'Fri', waste: 5, consumption: 48 },
  { name: 'Sat', waste: 4, consumption: 38 },
  { name: 'Sun', waste: 2, consumption: 43 },
];

const Widget = ({ title, value, icon, color }: any) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography color="text.secondary" variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
      </Box>
      <Box sx={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1.5, borderRadius: '50%', bgcolor: `${color}15` }}>
        {icon}
      </Box>
    </CardContent>
  </Card>
);

const OutletDashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Outlet Overview - Downtown
      </Typography>

      <Alert severity="warning" sx={{ mb: 4 }}>
        <strong>Notice:</strong> This dashboard is currently displaying mockup/dummy data. It is not yet connected to the live database metrics.
      </Alert>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 4 
      }}>
        <Widget title="Store Inventory Value" value={formatCurrency(42500)} icon={<Inventory />} color="#3b82f6" />
        <Widget title="Today's Purchases" value={formatCurrency(800)} icon={<Assessment />} color="#10b981" />
        <Widget title="Low Stock Items" value="5" icon={<Warning />} color="#f59e0b" />
        <Widget title="Daily Update Status" value="Pending" icon={<CheckCircle />} color="#ef4444" />
      </Box>

      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Weekly Consumption vs Waste</Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="consumption" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Consumption" />
              <Bar dataKey="waste" fill="#ef4444" radius={[4, 4, 0, 0]} name="Waste" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>
    </Box>
  );
};

export default OutletDashboard;
