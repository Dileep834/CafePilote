import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Dashboard, 
  Inventory, 
  Receipt, 
  Assessment, 
  Settings, 
  People, 
  Store,
  Warning,
  Brightness4,
  Brightness7,
  Logout,
  ShoppingCart,
  PrecisionManufacturing,
  LockReset
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeContext } from '../contexts/ThemeContext';
import { APP_NAME } from '../constants';
import { CafePilotsLogo } from '../components/CafePilotsLogo';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Companies', icon: <Store />, path: '/masters/companies' },
  { text: 'Point of Sale (POS)', icon: <ShoppingCart />, path: '/sales/entry' },
  { text: 'Live Inventory', icon: <Inventory />, path: '/inventory/current' },
  { text: 'Daily Update', icon: <Assessment />, path: '/inventory/daily-update' },
  { text: 'Adjustments', icon: <Inventory />, path: '/inventory/adjustments' },
  { text: 'Purchase Orders', icon: <Receipt />, path: '/purchase/orders' },
  { text: 'Wastage Log', icon: <Warning />, path: '/waste' },
  { text: 'Products', icon: <Store />, path: '/masters/products' },
  { text: 'Recipes', icon: <PrecisionManufacturing />, path: '/masters/recipes' },
  { text: 'Categories', icon: <Store />, path: '/masters/categories' },
  { text: 'Outlets', icon: <Store />, path: '/masters/outlets' },
  { text: 'Suppliers', icon: <Store />, path: '/masters/suppliers' },
  { text: 'Users', icon: <People />, path: '/users' },
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

const DashboardLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    const sessionId = useAuthStore.getState().sessionId;
    if (sessionId) {
      try {
        await supabase.from('user_sessions').update({ logout_time: new Date().toISOString() }).eq('id', sessionId);
      } catch (e) {
        console.error('Failed to log logout time', e);
      }
    }
    logout();
    navigate('/login');
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', user?.id);

      if (error) throw error;
      
      alert("Password updated successfully!");
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (err: any) {
      alert("Error updating password: " + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2, gap: 1 }}>
        <CafePilotsLogo size={42} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 800, 
            letterSpacing: '0.5px',
            fontSize: '1.25rem'
          }}
        >
          <span style={{ color: 'inherit' }}>Cafe</span>
          <span style={{ color: '#FF7A00' }}>Pilots</span>
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 2, pt: 2 }}>
        {menuItems.map((item) => {
          // Role-Based Access Logic for Sidebar
          const role = user?.role;
          if (item.text === 'Companies' && role !== 'Super Admin') return null;
          
          // Staff can only see Sales, Stock, and Waste
          if (role === 'Staff') {
            const staffAllowed = ['Dashboard', 'Point of Sale (POS)', 'Live Inventory', 'Daily Update', 'Adjustments', 'Wastage Log'];
            if (!staffAllowed.includes(item.text)) return null;
          }

          // Outlet Managers can see Sales and Suppliers but NOT Recipes/Products
          if (role === 'Outlet Owner') {
            const outletAllowed = ['Dashboard', 'Point of Sale (POS)', 'Live Inventory', 'Daily Update', 'Adjustments', 'Purchase Orders', 'Wastage Log', 'Suppliers', 'Settings'];
            if (!outletAllowed.includes(item.text)) return null;
          }

          const isSelected = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    transform: 'translateX(4px)'
                  },
                  '&.Mui-selected': {
                    bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)',
                    color: 'primary.main',
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ color: isSelected ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: isSelected ? 600 : 400 }}>{item.text}</Typography>} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Powered by <strong>CafePilot</strong>
        </Typography>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: mode === 'dark' ? 'rgba(24, 24, 27, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: 'none',
          boxShadow: 'none',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
            sx={{ ml: 1 }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              elevation: 4,
              sx: {
                width: 280,
                mt: 1.5,
                overflow: 'visible',
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user?.email || 'user@example.com'}
              </Typography>
              <Box sx={{ mt: 1, display: 'inline-block', px: 1, py: 0.25, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 1, fontSize: '0.75rem', fontWeight: 'bold' }}>
                {user?.role || 'Staff'}
              </Box>
            </Box>
            <Divider />
            <MenuItem onClick={() => { handleClose(); navigate('/settings'); }} sx={{ mt: 1 }}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); setPasswordDialogOpen(true); }}>
              <ListItemIcon>
                <LockReset fontSize="small" />
              </ListItemIcon>
              Change Password
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <Logout fontSize="small" color="error" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px dashed rgba(145, 158, 171, 0.24)' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 1, sm: 2, md: 3 }, 
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` }, 
          maxWidth: '100%',
          overflowX: 'hidden',
          mt: 8 
        }}
      >
        <Outlet />
      </Box>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            autoFocus
            helperText="Minimum 6 characters"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePasswordChange} disabled={passwordLoading}>
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardLayout;
