import React, { useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

export const useFeedback = () => {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });

  const showFeedback = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const FeedbackComponent = (
    <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert onClose={handleClose} severity={snackbar.severity} variant="filled" sx={{ width: '100%', boxShadow: 3 }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
  );

  return { showFeedback, FeedbackComponent };
};
