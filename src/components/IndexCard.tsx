import { useIndexSnapshot } from '../hooks/useMarketData';
import { getIndexById } from '../utils/catalog';
import {
  formatValue,
  formatAbsoluteChange,
  formatPercentageChange,
  formatTime,
  isStale,
} from '../utils/formatters';

interface IndexCardProps {
  indexId: string;
}

/**
 * IndexCard — displays the live snapshot for a single market index.
 * Handles loading skeleton, error state, and stale-data indicator.
 */
export function IndexCard({ indexId }: IndexCardProps) {
  const definition = getIndexById(indexId);
  const { data, isLoading, isError, error, isFetching } = useIndexSnapshot(indexId);

  if (!definition) {
    return (
      <div className="rounded-xl bg-surface p-4 text-sm text-slate-400">
        Unknown index: {indexId}
      </div>
    );
  }

  const isPositive = (data?.absoluteChange ?? 0) >= 0;
  const changeColor = isPositive ? 'text-gain' : 'text-loss';
  const bgAccent = isPositive ? 'border-gain/30' : 'border-loss/30';
  const stale = data ? isStale(data.lastUpdated) : false;

  return (
    <div
      className={`relative rounded-xl border bg-surface p-4 shadow-sm transition-all ${bgAccent}`}
      aria-label={`${definition.name} index card`}
    >
      {/* Stale data badge */}
      {stale && !isLoading && (
        <span
          className="absolute right-3 top-3 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400"
          title="Data may be outdated"
        >
          Stale
        </span>
      )}

      {/* Fetching indicator */}
      {isFetching && !isLoading && (
        <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-brand" />
      )}

      {/* Index name */}
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
        {definition.category}
      </p>
      <h2 className="text-base font-semibold text-slate-100">{definition.name}</h2>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mt-3 space-y-2 animate-pulse">
          <div className="h-8 w-3/4 rounded bg-surface-elevated" />
          <div className="h-4 w-1/2 rounded bg-surface-elevated" />
          <div className="h-3 w-1/3 rounded bg-surface-elevated" />
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="mt-3 text-sm text-loss">
          <p>Failed to load data</p>
          <p className="mt-1 text-xs text-slate-500">{error?.message}</p>
        </div>
      )}

      {/* Data */}
      {data && !isLoading && (
        <div className="mt-3">
          <p className="text-3xl font-bold tabular-nums text-slate-100">
            {formatValue(data.value)}
          </p>
          <p className={`mt-1 text-sm font-medium tabular-nums ${changeColor}`}>
            {isPositive ? '▲' : '▼'}{' '}
            {formatAbsoluteChange(data.absoluteChange)}{' '}
            ({formatPercentageChange(data.percentageChange)})
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Updated {formatTime(data.lastUpdated)}
          </p>
        </div>
      )}
    </div>
  );
}
