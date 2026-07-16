import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, TextField, Switch, FormControlLabel, Button, Divider, Snackbar, Alert, InputAdornment, IconButton, MenuItem } from '@mui/material';
import { Save, Visibility, VisibilityOff } from '@mui/icons-material';
import { useSettingsStore } from '../../store/useSettingsStore';

const SystemSettings: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const { viewScale, setViewScale } = useSettingsStore();

  // Form State
  const [settings, setSettings] = useState({
    companyName: 'Backbenchers Cafeteria',
    logoUrl: 'https://backbencherscafeteria.in/images/logo.png',
    address: 'Patel Chowk, RB Mehta Marg, near Neelyog Square, Saibaba Nagar, Pant Nagar, Ghatkopar East, Mumbai, Maharashtra 400077',
    phone: '+91 9702130632',
    email: 'backbencherscafeteria@gmail.com',
    
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
    <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>System Settings</Typography>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>Company / Cafe Configuration</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure your brand identity and public cafe details.
        </Typography>
        <Grid container spacing={3}>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
            <TextField fullWidth label="Company / Cafe Name" value={settings.companyName} onChange={e => handleChange('companyName', e.target.value)} />
          </Grid>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
            <TextField fullWidth label="Logo Image URL" value={settings.logoUrl} onChange={e => handleChange('logoUrl', e.target.value)} />
          </Grid>
          <Grid sx={{ width: '100%' }}>
            <TextField fullWidth label="Headquarters / Primary Address" multiline rows={2} value={settings.address} onChange={e => handleChange('address', e.target.value)} />
          </Grid>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
            <TextField fullWidth label="Contact Phone" value={settings.phone} onChange={e => handleChange('phone', e.target.value)} />
          </Grid>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
            <TextField fullWidth label="Contact Email" value={settings.email} onChange={e => handleChange('email', e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>Display Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Adjust the global zoom level of the application interface.
        </Typography>
        <Grid container spacing={3}>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
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
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>Inventory Update Configuration</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure the daily stock submission window and reminders for outletes.
        </Typography>

        <Grid container spacing={3}>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
            <TextField fullWidth label="Opening Time" type="time" value={settings.openingTime} onChange={e => handleChange('openingTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
            <TextField fullWidth label="Closing Time (Deadline)" type="time" value={settings.closingTime} onChange={e => handleChange('closingTime', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
            <TextField fullWidth label="Grace Period (Minutes)" type="number" value={settings.gracePeriod} onChange={e => handleChange('gracePeriod', Number(e.target.value))} />
          </Grid>
          <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
            <TextField fullWidth label="Reminder Interval (Minutes)" type="number" value={settings.reminderInterval} onChange={e => handleChange('reminderInterval', Number(e.target.value))} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControlLabel control={<Switch checked={settings.autoLock} onChange={e => handleChange('autoLock', e.target.checked)} />} label="Auto Lock Inventory After Deadline" />
          <FormControlLabel control={<Switch checked={settings.autoCalculate} onChange={e => handleChange('autoCalculate', e.target.checked)} />} label="Auto Calculate Closing Stock" />
          <FormControlLabel control={<Switch checked={settings.allowNegative} onChange={e => handleChange('allowNegative', e.target.checked)} />} label="Allow Negative Stock" />
        </Box>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>Notification Settings</Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel control={<Switch checked={settings.emailNotif} onChange={e => handleChange('emailNotif', e.target.checked)} />} label="Email Notifications" />
          <FormControlLabel control={<Switch checked={settings.inAppNotif} onChange={e => handleChange('inAppNotif', e.target.checked)} />} label="In-App Notifications" />
          <FormControlLabel control={<Switch checked={settings.smsNotif} onChange={e => handleChange('smsNotif', e.target.checked)} />} label="SMS Alerts" />
          <FormControlLabel control={<Switch checked={settings.waNotif} onChange={e => handleChange('waNotif', e.target.checked)} />} label="WhatsApp Integration" />
        </Box>
      </Paper>
      
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>SMTP Email Configuration</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure your dedicated outgoing mail server to send automated emails and alerts.
        </Typography>

        <Grid container spacing={3}>
          <Grid sx={{ width: '100%' }}>
            <TextField 
              fullWidth 
              label="From Email Address" 
              placeholder="e.g. alerts@backbencherscafeteria.in"
              value={settings.smtpFrom} 
              onChange={e => handleChange('smtpFrom', e.target.value)} 
            />
          </Grid>
          <Grid sx={{ width: '100%' }}>
            <TextField 
              fullWidth 
              label="Default To Email Address" 
              placeholder="e.g. admin@backbencherscafeteria.in"
              value={settings.smtpTo} 
              onChange={e => handleChange('smtpTo', e.target.value)} 
            />
          </Grid>
          <Grid sx={{ width: '100%' }}>
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
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 4 }}>
        <Button variant="contained" size="large" startIcon={<Save />} onClick={handleSave}>
          Save Configuration
        </Button>
      </Box>

      <Snackbar open={toastOpen} autoHideDuration={4000} onClose={() => setToastOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%' }} variant="filled">
          Configuration saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;
