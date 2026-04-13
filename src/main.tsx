import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';

/**
 * React Query client configuration.
 * - staleTime: data is considered fresh for 90 seconds globally.
 * - gcTime: unused cache entries are garbage collected after 10 minutes.
 * - retry: failed requests are retried up to 2 times.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 90 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
