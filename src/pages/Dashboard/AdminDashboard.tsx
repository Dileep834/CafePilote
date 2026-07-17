import React from 'react';
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { Inventory, Assessment, Warning, CheckCircle } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';

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

const fetchDashboardStats = async () => {
  // Fetch inventory with product cost price
  const { data: inventoryData, error: invError } = await supabase
    .from('inventory')
    .select('current_quantity, product_id, products(purchase_price, min_stock)');
    
  if (invError) throw invError;

  // Calculate Total Value and Low Stock Items
  let totalValue = 0;
  let lowStockCount = 0;

  inventoryData?.forEach((item: any) => {
    const qty = Number(item.current_quantity) || 0;
    const cost = Number(item.products?.purchase_price) || 0;
    const minStock = Number(item.products?.min_stock) || 10;
    
    totalValue += qty * cost;
    
    if (qty < minStock) {
      lowStockCount++;
    }
  });

  // Fetch today's purchases (dummy zero for now if purchase_orders doesn't exist, we fallback safely)
  let todaysPurchases = 0;
  let pendingUpdates = 0;

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: poData } = await supabase
      .from('purchase_orders')
      .select('total_amount, status, created_at')
      .gte('created_at', `${today}T00:00:00.000Z`);
      
    poData?.forEach((po: any) => {
      todaysPurchases += Number(po.total_amount) || 0;
      if (po.status === 'pending') {
        pendingUpdates++;
      }
    });
  } catch (e) {
    console.warn("Purchase orders table might not exist yet", e);
  }

  return {
    totalValue,
    lowStockCount,
    todaysPurchases,
    pendingUpdates
  };
};

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchDashboardStats
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Overview
      </Typography>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 4 
      }}>
        <Widget 
          title="Total Inventory Value" 
          value={formatCurrency(stats?.totalValue || 0)} 
          icon={<Inventory />} 
          color="#3b82f6" 
        />
        <Widget 
          title="Today's Purchases" 
          value={formatCurrency(stats?.todaysPurchases || 0)} 
          icon={<Assessment />} 
          color="#10b981" 
        />
        <Widget 
          title="Low Stock Items" 
          value={stats?.lowStockCount || 0} 
          icon={<Warning />} 
          color="#f59e0b" 
        />
        <Widget 
          title="Pending Updates" 
          value={stats?.pendingUpdates || 0} 
          icon={<CheckCircle />} 
          color="#ef4444" 
        />
      </Box>
    </Box>
  );
};

export default AdminDashboard;
