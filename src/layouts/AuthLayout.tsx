import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Paper } from '@mui/material';

const AuthLayout: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => 
          theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #f6f8fd 0%, #f1f5f9 100%)' 
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 4,
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
        }}
      >
        <Outlet />
      </Paper>
    </Box>
  );
};

export default AuthLayout;
