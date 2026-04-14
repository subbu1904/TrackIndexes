import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MockProvider } from '../features/indexes/provider/mockProvider';
import { YahooFinanceProvider } from '../features/indexes/provider/yahooProvider';
import type { IndexDataProvider } from '../features/indexes/provider/IndexDataProvider';

/**
 * React Query client — shared configuration.
 * staleTime and gcTime are set conservatively for market data.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 minute
      gcTime: 10 * 60 * 1000,     // 10 minutes
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

/**
 * Active data provider — uses YahooFinanceProvider (live data via native HTTP)
 * by default. Set VITE_USE_MOCK=true at build time to use MockProvider instead
 * (useful for development/offline testing without hitting Yahoo Finance).
 */
function createDataProvider(): IndexDataProvider {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    console.info('[TrackIndexes] VITE_USE_MOCK=true — using MockProvider.');
    return new MockProvider({ delayMs: 700 });
  }
  console.info('[TrackIndexes] Using YahooFinanceProvider (native HTTP, no proxy required).');
  return new YahooFinanceProvider();
}

export const dataProvider: IndexDataProvider = createDataProvider();

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
