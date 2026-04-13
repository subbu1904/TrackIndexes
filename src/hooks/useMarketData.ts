import { useQuery } from '@tanstack/react-query';
import { dataProvider } from '../api';
import { getIndexById } from '../utils/catalog';
import type { IndexSnapshot } from '../types';

/** Refresh interval for market data (in milliseconds). */
const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/** Stale time: data is considered fresh for this duration before a background refetch. */
const STALE_TIME_MS = 90 * 1000; // 90 seconds

/**
 * Fetch the latest snapshot for a single index.
 * Returns loading, error, and data states for use in IndexCard.
 */
export function useIndexSnapshot(indexId: string) {
  const definition = getIndexById(indexId);

  return useQuery<IndexSnapshot, Error>({
    queryKey: ['index-snapshot', indexId],
    queryFn: async () => {
      if (!definition) {
        throw new Error(`Unknown index ID: ${indexId}`);
      }
      return dataProvider.fetchSnapshot(definition.symbol);
    },
    enabled: !!definition,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    // Keep previous data visible while a background refetch is in progress
    placeholderData: (prev) => prev,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

/**
 * Fetch snapshots for all currently selected indexes.
 * Useful for a bulk prefetch on app load.
 */
export function useAllIndexSnapshots(indexIds: string[]) {
  const symbols = indexIds
    .map((id) => getIndexById(id)?.symbol)
    .filter((s): s is string => !!s);

  return useQuery<IndexSnapshot[], Error>({
    queryKey: ['index-snapshots-bulk', ...indexIds],
    queryFn: () => dataProvider.fetchSnapshots(symbols),
    enabled: symbols.length > 0,
    staleTime: STALE_TIME_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: 2,
  });
}
