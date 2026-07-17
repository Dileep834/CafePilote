import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm as useHookForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  InputAdornment, 
  IconButton,
  Alert
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { Role, APP_NAME, APP_LOGO } from '../constants';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useHookForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      // Live database login check
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', data.email)
        .eq('is_active', true)
        .single();
        
      if (dbError || !dbUser) {
        setError('Invalid login. User not found or inactive.');
        return;
      }
      
      // Verify Password
      if (dbUser.password && dbUser.password !== data.password) {
        setError('Invalid password. Please try again.');
        return;
      }
      
      // Log the user in
      login({
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        outletId: dbUser.outlet_id,
        companyId: dbUser.company_id,
        isActive: dbUser.is_active
      }, 'live-jwt-token');
      navigate('/dashboard');
      
    } catch (_err) {
      setError('An error occurred during login');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Box 
          component="img"
          src={APP_LOGO}
          alt={APP_NAME}
          sx={{ maxHeight: 100, maxWidth: '80%', objectFit: 'contain', mb: 2 }}
        />
        <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          {APP_NAME}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Inventory & Operations Management
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          {...register('email')}
          label="Email Address"
          fullWidth
          margin="normal"
          error={!!errors.email}
          helperText={errors.email?.message}
          autoComplete="email"
          autoFocus
        />
        <TextField
          {...register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          error={!!errors.password}
          helperText={errors.password?.message}
          autoComplete="current-password"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }
          }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 4, mb: 2, py: 1.5 }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Powered by <strong>CafePilot</strong> SaaS
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;
