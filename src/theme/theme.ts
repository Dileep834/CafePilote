import type { ThemeOptions } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Poppins", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem' },
    h2: { fontWeight: 600, fontSize: '1.75rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1rem' },
    h6: { fontWeight: 600, fontSize: '0.875rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          boxShadow: '0px 4px 10px rgba(37, 99, 235, 0.2)',
          '&:hover': {
            boxShadow: '0px 6px 15px rgba(37, 99, 235, 0.35)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 8px 24px rgba(149, 157, 165, 0.08)',
          backgroundImage: 'none',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0px 12px 32px rgba(149, 157, 165, 0.12)',
          }
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f0f0f0',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8f9fa',
            borderBottom: 'none',
          },
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: 'light',
    primary: {
      main: '#FF6A00', // Brand Primary Orange
      light: '#FFB347',
      dark: '#cc5500',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0D1B2A', // Brand Dark Navy
      light: '#1B263B',
      dark: '#060e16',
      contrastText: '#ffffff',
    },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    info: { main: '#3b82f6' },
    success: { main: '#22c55e' },
    background: {
      default: '#F3F3F8', // Brand Light Gray
      paper: '#ffffff',
    },
    text: {
      primary: '#0D1B2A',
      secondary: '#64748b',
    },
  },
});

export const darkTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#FF6A00',
      light: '#FFB347',
      dark: '#cc5500',
    },
    secondary: {
      main: '#0D1B2A',
      light: '#1B263B',
    },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    info: { main: '#3b82f6' },
    success: { main: '#22c55e' },
    background: {
      default: '#0D1B2A',
      paper: '#1B263B',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
  },
});
