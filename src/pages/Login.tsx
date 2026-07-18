import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { CafePilotsLogo } from '../components/CafePilotsLogo';
import { useAuthStore } from '../store/useAuthStore';
import { APP_NAME, APP_TAGLINE, HQ_COMPANY_ID, Role } from '../constants';
import { isMarketingHost } from '../lib/appHost';
import { authenticateStaff } from '../lib/staffSessionService';

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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSessionExpired = useAuthStore((state) => state.isSessionExpired);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useHookForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  React.useEffect(() => {
    if (isAuthenticated && !isSessionExpired()) {
      navigate('/erp', { replace: true });
    }
  }, [isAuthenticated, isSessionExpired, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      const { user, token, sessionId } = await authenticateStaff(data.email, data.password);
      login(user, token, sessionId);

      // Reset stale tenant persist so header shows HQ + correct plan
      try {
        const { useTenantStore } = await import('../store/useTenantStore');
        if (user.role === Role.SUPER_ADMIN) {
          useTenantStore.setState({
            companyId: HQ_COMPANY_ID,
            planId: 'enterprise',
          });
        }
        await useTenantStore.getState().hydrateFromUser(user);
      } catch {
        /* ignore */
      }
      navigate('/erp');
      
    } catch (err: any) {
      setError(err?.message || 'An error occurred during login');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Box sx={{ mb: 2 }}>
          <CafePilotsLogo size={56} withWordmark withDivider />
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            color: (theme) => theme.palette.mode === 'light' ? 'text.secondary' : 'rgba(255,255,255,0.7)' 
          }}
        >
          {APP_TAGLINE}
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
        {isMarketingHost() && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            <Link to="/" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Back to website
            </Link>
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Powered by <strong>{APP_NAME}</strong> SaaS
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;
