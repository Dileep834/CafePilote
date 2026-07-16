import React from 'react';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ErrorOutline, Home } from '@mui/icons-material';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper 
        elevation={24} 
        sx={{ 
          p: 6, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center',
          borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        }}
      >
        <ErrorOutline sx={{ fontSize: 100, color: 'primary.main', mb: 2, opacity: 0.8 }} />
        
        <Typography variant="h1" sx={{ fontWeight: 900, color: 'text.primary', mb: 1, fontSize: { xs: '4rem', md: '6rem' } }}>
          404
        </Typography>
        
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary', mb: 3 }}>
          Oops! Page Not Found
        </Typography>
        
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 5, maxWidth: '500px' }}>
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. Let's get you back on track.
        </Typography>
        
        <Button 
          variant="contained" 
          size="large" 
          startIcon={<Home />} 
          onClick={() => navigate('/dashboard')}
          sx={{ 
            px: 4, 
            py: 1.5, 
            borderRadius: 8,
            textTransform: 'none',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(0,118,255,0.23)'
            }
          }}
        >
          Back to Dashboard
        </Button>
      </Paper>
    </Container>
  );
};

export default NotFound;
