import { useQuery } from '@tanstack/react-query';
import type { IndexDataProvider } from '../provider/IndexDataProvider';
import type { ProviderResult } from '../types';

/** Refresh interval for market data (ms). */
const REFETCH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/** Data is considered fresh for this duration before a background refetch. */
const STALE_TIME_MS = 60 * 1000; // 1 minute

/**
 * Fetch snapshots for the given index IDs via the supplied provider.
 * The provider is injected so it can be swapped (mock ↔ live) without
 * changing this hook or any component that uses it.
 *
 * Returns a single ProviderResult so the UI can handle partial failures
 * per-card rather than failing the entire grid.
 */
export function useIndexSnapshots(
  provider: IndexDataProvider,
  indexIds: string[]
) {
  return useQuery<ProviderResult, Error>({
    queryKey: ['indexSnapshots', indexIds],
    queryFn: () => provider.getSnapshots(indexIds),
    enabled: indexIds.length > 0,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    // Keep previous data visible during background refetch
    placeholderData: (prev) => prev,
  });
}
