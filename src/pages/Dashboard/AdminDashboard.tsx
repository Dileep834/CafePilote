import { formatCurrency } from '../../utils/format';
import React from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import { Inventory, Assessment, Warning, CheckCircle } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const data = [
  { name: 'Jan', value: 4000, purchase: 2400 },
  { name: 'Feb', value: 3000, purchase: 1398 },
  { name: 'Mar', value: 2000, purchase: 9800 },
  { name: 'Apr', value: 2780, purchase: 3908 },
  { name: 'May', value: 1890, purchase: 4800 },
  { name: 'Jun', value: 2390, purchase: 3800 },
  { name: 'Jul', value: 3490, purchase: 4300 },
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

const AdminDashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Overview
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 4 
      }}>
        <Widget title="Total Inventory Value" value={formatCurrency(124500)} icon={<Inventory />} color="#3b82f6" />
        <Widget title="Today's Purchases" value={formatCurrency(3200)} icon={<Assessment />} color="#10b981" />
        <Widget title="Low Stock Items" value="12" icon={<Warning />} color="#f59e0b" />
        <Widget title="Pending Updates" value="3" icon={<CheckCircle />} color="#ef4444" />
      </Box>
      
      {/* Charts will go here */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
        gap: 3 
      }}>
        <Card sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>Inventory Trend</Typography>
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={40} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Card>
        <Card sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          <Typography variant="h6" gutterBottom>Monthly Purchases</Typography>
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={40} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="purchase" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
