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
 * Active data provider — switches between mock and live based on VITE_PROXY_URL.
 * Per RevisedBuildPlan.md §F: treat proxy as likely required; mock first.
 */
function createDataProvider(): IndexDataProvider {
  const proxyUrl = import.meta.env.VITE_PROXY_URL as string | undefined;
  if (proxyUrl) {
    console.info(`[TrackIndexes] Using YahooFinanceProvider via proxy: ${proxyUrl}`);
    return new YahooFinanceProvider(proxyUrl);
  }
  console.info('[TrackIndexes] VITE_PROXY_URL not set — using MockProvider.');
  return new MockProvider({ delayMs: 700 });
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
