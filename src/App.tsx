import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomThemeProvider } from './contexts/ThemeContext';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import { ConfigErrorScreen } from './components/ConfigErrorScreen';
import { missingSupabaseConfig, supabaseConfigError } from './lib/supabase';
import { APP_DOMAIN } from './constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  if (missingSupabaseConfig) {
    return (
      <ConfigErrorScreen
        title="Missing Supabase configuration"
        message={
          supabaseConfigError ||
          'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel (or your host), then redeploy so Vite can bake them into the build.'
        }
        details={`Domain: ${APP_DOMAIN} — env vars must exist at build time for production (repo: Dileep834/CafePilote).`}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary area="app">
        <CustomThemeProvider>
          <BrowserRouter>
            <ErrorBoundary area="routes">
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </CustomThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
