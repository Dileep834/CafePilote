
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomThemeProvider } from './contexts/ThemeContext';
import AppRoutes from './routes';

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
      <CustomThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CustomThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
