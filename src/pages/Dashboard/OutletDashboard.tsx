import React from 'react';
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { Inventory, Assessment, Warning, CheckCircle } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
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

const fetchOutletStats = async (outletId: string | undefined) => {
  if (!outletId) return null;

  // Fetch inventory with product cost price
  const { data: inventoryData, error: invError } = await supabase
    .from('inventory')
    .select('current_quantity, products(purchase_price, min_stock)')
    .eq('outlet_id', outletId);
    
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

  // Fetch Today's Purchases
  const today = new Date().toISOString().split('T')[0];
  const { data: purchaseData, error: poError } = await supabase
    .from('purchase_orders')
    .select('total_amount')
    .eq('outlet_id', outletId)
    .eq('expected_date', today);
    
  if (poError) throw poError;
  const todaysPurchases = purchaseData?.reduce((sum, po) => sum + Number(po.total_amount), 0) || 0;

  // Fetch Daily Stock Updates Status
  const { data: dailyStockUpdates } = await supabase
    .from('daily_stock')
    .select('status')
    .eq('outlet_id', outletId)
    .eq('date', today);

  const isUpdatePending = dailyStockUpdates?.some(ds => ds.status === 'Draft');

  // Fetch Weekly Consumption vs Waste Data
  const { data: weeklyData } = await supabase
    .from('daily_stock')
    .select('date, consumption, waste')
    .eq('outlet_id', outletId)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: true });

  const chartData: any[] = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  if (weeklyData) {
    // Group by date
    const grouped = weeklyData.reduce((acc: any, curr) => {
      const dateStr = curr.date;
      if (!acc[dateStr]) acc[dateStr] = { waste: 0, consumption: 0 };
      acc[dateStr].waste += Number(curr.waste) || 0;
      acc[dateStr].consumption += Number(curr.consumption) || 0;
      return acc;
    }, {});

    Object.keys(grouped).forEach(dateStr => {
      const date = new Date(dateStr);
      chartData.push({
        name: days[date.getDay()],
        waste: grouped[dateStr].waste,
        consumption: grouped[dateStr].consumption
      });
    });
  }

  // Ensure chart has at least some placeholders if empty
  if (chartData.length === 0) {
    chartData.push({ name: 'No Data', waste: 0, consumption: 0 });
  }

  return {
    totalValue,
    todaysPurchases,
    lowStockCount,
    isUpdatePending: isUpdatePending ? 'Pending' : 'Updated',
    chartData
  };
};

const OutletDashboard: React.FC = () => {
  const { user } = useAuthStore();
  
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['outlet-dashboard-stats', user?.outletId],
    queryFn: () => fetchOutletStats(user?.outletId),
    enabled: !!user?.outletId,
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">Error loading dashboard data</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Outlet Overview - {user?.outlet?.name || 'Local Store'}
      </Typography>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 4 
      }}>
        <Widget title="Store Inventory Value" value={formatCurrency(stats?.totalValue || 0)} icon={<Inventory />} color="#3b82f6" />
        <Widget title="Today's Purchases" value={formatCurrency(stats?.todaysPurchases || 0)} icon={<Assessment />} color="#10b981" />
        <Widget title="Low Stock Items" value={stats?.lowStockCount || 0} icon={<Warning />} color="#f59e0b" />
        <Widget 
          title="Daily Update Status" 
          value={stats?.isUpdatePending || 'Updated'} 
          icon={<CheckCircle />} 
          color={stats?.isUpdatePending === 'Pending' ? "#ef4444" : "#10b981"} 
        />
      </Box>

      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Weekly Consumption vs Waste</Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.chartData || []}>
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
