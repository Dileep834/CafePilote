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
import { Visibility, VisibilityOff, RestaurantMenu } from '@mui/icons-material';
import { useAuthStore } from '../store/useAuthStore';
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
      // Mock login logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (data.email === 'admin@cafepilot.com' && data.password === 'admin123') {
        login({
          id: 's0000000-0000-0000-0000-000000000000',
          name: 'Platform Super Admin',
          email: 'admin@cafepilot.com',
          role: Role.SUPER_ADMIN,
          companyId: 'SYSTEM',
          isActive: true
        }, 'mock-jwt-token');
        navigate('/dashboard');
      } else if (data.email === 'admin@backbenchers.com' && data.password === 'admin123') {
        login({
          id: 'd1000000-0000-0000-0000-000000000001',
          name: 'Backbenchers Head Office',
          email: 'admin@backbenchers.com',
          role: Role.ADMIN,
          companyId: 'c1000000-0000-0000-0000-000000000001',
          isActive: true
        }, 'mock-jwt-token');
        navigate('/dashboard');
      } else if (data.email === 'ghatkopar@backbenchers.com' && data.password === 'admin123') {
        login({
          id: 'd2000000-0000-0000-0000-000000000002',
          name: 'Ghatkopar Manager',
          email: 'ghatkopar@backbenchers.com',
          role: Role.OUTLET_OWNER,
          outletId: 'f1000000-0000-0000-0000-000000000001',
          companyId: 'c1000000-0000-0000-0000-000000000001',
          isActive: true
        }, 'mock-jwt-token');
        navigate('/dashboard');
      } else if (data.email === 'staff@backbenchers.com' && data.password === 'admin123') {
        login({
          id: 'd3000000-0000-0000-0000-000000000003',
          name: 'Ghatkopar Staff',
          email: 'staff@backbenchers.com',
          role: Role.STAFF,
          outletId: 'f1000000-0000-0000-0000-000000000001',
          companyId: 'c1000000-0000-0000-0000-000000000001',
          isActive: true
        }, 'mock-jwt-token');
        navigate('/dashboard');
      } else {
        setError('Invalid login. Try admin@cafepilot.com, admin@backbenchers.com, ghatkopar@backbenchers.com, or staff@backbenchers.com');
      }
    } catch (err) {
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
