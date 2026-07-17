
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomThemeProvider } from './contexts/ThemeContext';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <CustomThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CustomThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
