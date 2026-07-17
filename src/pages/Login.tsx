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
import { Coffee } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { Role, APP_NAME } from '../constants';

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
      
      // Create a user login log session
      let sessionId = null;
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('user_sessions')
          .insert([{ user_id: dbUser.id, company_id: dbUser.company_id }])
          .select('id')
          .single();
          
        if (!sessionError && sessionData) {
          sessionId = sessionData.id;
        }
      } catch (err) {
        console.warn('Failed to create session log', err);
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
      }, 'live-jwt-token', sessionId || undefined);
      navigate('/dashboard');
      
    } catch (_err) {
      setError('An error occurred during login');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Box 
          sx={{ 
            width: 80, 
            height: 80, 
            bgcolor: 'primary.main', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 2,
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
          }}
        >
          <Coffee size={40} color="white" />
        </Box>
        <Typography 
          variant="h5" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold', 
            letterSpacing: '1px',
            color: (theme) => theme.palette.mode === 'light' ? 'text.primary' : 'common.white',
            textShadow: (theme) => theme.palette.mode === 'light' ? 'none' : '0 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          {APP_NAME}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: (theme) => theme.palette.mode === 'light' ? 'text.secondary' : 'rgba(255,255,255,0.7)' 
          }}
        >
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
