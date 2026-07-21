import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Switch, FormControlLabel, Button, Divider, Snackbar, Alert, InputAdornment, IconButton, MenuItem, Tabs, Tab } from '@mui/material';
import { Save, Visibility, VisibilityOff } from '@mui/icons-material';
import { useSettingsStore } from '../../store/useSettingsStore';
import { DatabaseSettings } from './DatabaseSettings';

const SystemSettings: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const { 
    viewScale, setViewScale,
    taxMode, defaultTaxRate, taxInclusive, serviceChargeMode, serviceChargeValue, roundingRule, updateTaxSettings
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Form State
  const [settings, setSettings] = useState({
    companyName: 'CafePilots HQ',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
    
    openingTime: '20:00',
    closingTime: '23:00',
    gracePeriod: 30,
    reminderInterval: 30,
    
    autoLock: true,
    autoCalculate: true,
    allowNegative: false,
    
    emailNotif: true,
    inAppNotif: true,
    smsNotif: false,
    waNotif: false,

    smtpFrom: '',
    smtpTo: '',
    smtpPassword: ''
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('companySettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('companySettings', JSON.stringify(settings));
    setToastOpen(true);
  };

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4, pb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>System Settings</Typography>
        <Button variant="contained" size="large" color="primary" startIcon={<Save />} onClick={handleSave} sx={{ px: 4, py: 1.5, borderRadius: 2 }}>
          Save Changes
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="General" />
          <Tab label="Tax & Pricing" />
          <Tab label="Inventory" />
          <Tab label="Notifications" />
          <Tab label="SMTP / Email" />
          <Tab label="Database" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* COMPANY CONFIGURATION */}
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Company & Cafe Identity</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Configure your brand identity and public cafe details.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <TextField fullWidth label="Company / Cafe Name" value={settings.companyName} onChange={e => handleChange('companyName', e.target.value)} />
          <TextField fullWidth label="Logo Image URL" value={settings.logoUrl} onChange={e => handleChange('logoUrl', e.target.value)} />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField fullWidth label="Headquarters / Primary Address" multiline rows={2} value={settings.address} onChange={e => handleChange('address', e.target.value)} />
          </Box>
          <TextField fullWidth label="Contact Phone" value={settings.phone} onChange={e => handleChange('phone', e.target.value)} />
          <TextField fullWidth label="Contact Email" value={settings.email} onChange={e => handleChange('email', e.target.value)} />
        </Box>
      </Paper>
      
      {/* DISPLAY SETTINGS */}
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Display & UI</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Adjust the global zoom level of the application interface.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <TextField 
            select 
            fullWidth 
            label="Interface View Scale" 
            value={viewScale} 
            onChange={e => setViewScale(Number(e.target.value))}
          >
            <MenuItem value={70}>Small (70%)</MenuItem>
            <MenuItem value={80}>Normal (80%)</MenuItem>
            <MenuItem value={100}>Large (100%)</MenuItem>
          </TextField>
        </Box>
      </Paper>
      </Box>
      )}

      {activeTab === 1 && (
      {/* TAX & PRICING ENGINE */}
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Tax & Pricing Engine</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Configure GST modes, service charges, inclusive pricing, and receipt rounding rules.
        </Typography>
        
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold', display: 'block', mb: 2 }}>
          Tax Settings
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
          <TextField 
            select 
            fullWidth 
            label="Tax Mode" 
            value={taxMode} 
            onChange={e => updateTaxSettings({ taxMode: e.target.value as any })}
          >
            <MenuItem value="none">Mode 1: No Tax (Tax Exempt)</MenuItem>
            <MenuItem value="flat">Mode 2: Flat Tax (Global Rate)</MenuItem>
            <MenuItem value="per_product">Mode 3: Per-Product Tax</MenuItem>
          </TextField>
          
          {taxMode === 'flat' ? (
            <TextField 
              fullWidth 
              type="number"
              label="Global Default GST Rate (%)" 
              value={defaultTaxRate} 
              onChange={e => updateTaxSettings({ defaultTaxRate: Number(e.target.value) })}
            />
          ) : <Box />}
        </Box>

        <Box sx={{ mb: 4, p: 2, bgcolor: 'slate.50', borderRadius: 2, border: '1px solid', borderColor: 'slate.200' }}>
          <FormControlLabel 
            control={<Switch checked={taxInclusive} onChange={e => updateTaxSettings({ taxInclusive: e.target.checked })} color="primary" />} 
            label={
              <Box>
                <Typography variant="body1" fontWeight="medium">Inclusive Tax Pricing</Typography>
                <Typography variant="body2" color="text.secondary">Product shelf price already includes the GST amount.</Typography>
              </Box>
            }
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold', display: 'block', mb: 2 }}>
          Service Charges
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 4 }}>
          <TextField 
            select 
            fullWidth 
            label="Service Charge Mode" 
            value={serviceChargeMode} 
            onChange={e => updateTaxSettings({ serviceChargeMode: e.target.value as any })}
          >
            <MenuItem value="disabled">Disabled</MenuItem>
            <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
            <MenuItem value="percentage">Percentage (%)</MenuItem>
          </TextField>

          {serviceChargeMode !== 'disabled' ? (
            <TextField 
              fullWidth 
              type="number"
              label="Service Charge Value" 
              value={serviceChargeValue} 
              onChange={e => updateTaxSettings({ serviceChargeValue: Number(e.target.value) })}
            />
          ) : <Box />}
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold', display: 'block', mb: 2 }}>
          Receipt Rules
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <TextField 
            select 
            fullWidth 
            label="Receipt Rounding Rule" 
            value={roundingRule} 
            onChange={e => updateTaxSettings({ roundingRule: e.target.value as any })}
            helperText="Defines how the final grand total on the receipt is rounded."
          >
            <MenuItem value="none">No Rounding (Exact Decimals)</MenuItem>
            <MenuItem value="up">Round Up (Ceil to next integer)</MenuItem>
            <MenuItem value="down">Round Down (Floor to integer)</MenuItem>
            <MenuItem value="nearest_1">Nearest Rupee / Integer</MenuItem>
            <MenuItem value="nearest_0_5">Nearest 0.50</MenuItem>
          </TextField>
        </Box>
      </Paper>
      )}

      {activeTab === 2 && (
      {/* INVENTORY SETTINGS */}
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Inventory Automation</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Configure the daily stock submission window and reminders for outlets.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 4 }}>
          <TextField fullWidth label="Opening Time" type="time" value={settings.openingTime} onChange={e => handleChange('openingTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField fullWidth label="Closing Time (Deadline)" type="time" value={settings.closingTime} onChange={e => handleChange('closingTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField fullWidth label="Grace Period (Minutes)" type="number" value={settings.gracePeriod} onChange={e => handleChange('gracePeriod', Number(e.target.value))} />
          <TextField fullWidth label="Reminder Interval (Minutes)" type="number" value={settings.reminderInterval} onChange={e => handleChange('reminderInterval', Number(e.target.value))} />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel control={<Switch checked={settings.autoLock} onChange={e => handleChange('autoLock', e.target.checked)} color="primary" />} label="Auto Lock Inventory After Deadline" />
          <FormControlLabel control={<Switch checked={settings.autoCalculate} onChange={e => handleChange('autoCalculate', e.target.checked)} color="primary" />} label="Auto Calculate Closing Stock" />
          <FormControlLabel control={<Switch checked={settings.allowNegative} onChange={e => handleChange('allowNegative', e.target.checked)} color="primary" />} label="Allow Negative Stock" />
        </Box>
      </Paper>
      )}

      {activeTab === 3 && (
      {/* NOTIFICATION SETTINGS */}
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Communications & Alerts</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Choose how the system communicates with managers and staff.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <FormControlLabel control={<Switch checked={settings.emailNotif} onChange={e => handleChange('emailNotif', e.target.checked)} color="primary" />} label="Email Notifications" />
          <FormControlLabel control={<Switch checked={settings.inAppNotif} onChange={e => handleChange('inAppNotif', e.target.checked)} color="primary" />} label="In-App Notifications" />
          <FormControlLabel control={<Switch checked={settings.smsNotif} onChange={e => handleChange('smsNotif', e.target.checked)} color="primary" />} label="SMS Alerts" />
          <FormControlLabel control={<Switch checked={settings.waNotif} onChange={e => handleChange('waNotif', e.target.checked)} color="primary" />} label="WhatsApp Integration" />
        </Box>
      </Paper>
      )}
      
      {activeTab === 4 && (
      {/* SMTP CONFIGURATION */}
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">SMTP Email Server</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Configure your dedicated outgoing mail server to send automated emails and alerts.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
          <TextField 
            fullWidth 
            label="From Email Address" 
            placeholder="e.g. alerts@backbencherscafeteria.in"
            value={settings.smtpFrom} 
            onChange={e => handleChange('smtpFrom', e.target.value)} 
          />
          <TextField 
            fullWidth 
            label="Default To Email Address" 
            placeholder="e.g. admin@backbencherscafeteria.in"
            value={settings.smtpTo} 
            onChange={e => handleChange('smtpTo', e.target.value)} 
          />
          <TextField 
            fullWidth 
            label="SMTP Password / App Password" 
            type={showPassword ? 'text' : 'password'}
            value={settings.smtpPassword} 
            onChange={e => handleChange('smtpPassword', e.target.value)} 
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
          />
        </Box>
      </Paper>
      )}

      {activeTab === 5 && (
        <DatabaseSettings />
      )}

      <Snackbar open={toastOpen} autoHideDuration={4000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%' }} variant="filled">
          Settings successfully saved!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;
