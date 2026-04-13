import type { IndexSnapshot } from '../types';

interface IndexCardProps {
  name: string;
  snapshot?: IndexSnapshot;
  isLoading?: boolean;
  isError?: boolean;
  errorReason?: string;
}

/**
 * IndexCard — displays the live snapshot for a single market index.
 * Props-driven: the parent (IndexGrid) resolves data and passes it down.
 * Handles loading skeleton, error state, and freshness badge.
 */
export function IndexCard({
  name,
  snapshot,
  isLoading,
  isError,
  errorReason,
}: IndexCardProps) {
  const isPositive = (snapshot?.absoluteChange ?? 0) >= 0;
  const sign = isPositive ? '+' : '';
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
  const borderColor = isPositive ? 'border-green-500/20' : 'border-red-500/20';

  return (
    <div
      className={`relative rounded-2xl border bg-slate-800 p-4 shadow-sm transition-colors ${borderColor}`}
      aria-label={`${name} index card`}
    >
      {/* Index name */}
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
        {snapshot?.source ?? '—'}
      </div>
      <h2 className="text-base font-semibold text-slate-100">{name}</h2>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mt-3 animate-pulse space-y-2">
          <div className="h-8 w-3/4 rounded bg-slate-700" />
          <div className="h-4 w-1/2 rounded bg-slate-700" />
          <div className="h-3 w-1/3 rounded bg-slate-700" />
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="mt-3 text-sm text-red-400">
          <p>Failed to load data</p>
          {errorReason && (
            <p className="mt-1 text-xs text-slate-500">{errorReason}</p>
          )}
        </div>
      )}

      {/* Data */}
      {snapshot && !isLoading && (
        <div className="mt-3">
          <p className="text-3xl font-bold tabular-nums text-slate-100">
            {snapshot.value.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className={`mt-1 text-sm font-medium tabular-nums ${changeColor}`}>
            {isPositive ? '▲' : '▼'}{' '}
            {sign}{snapshot.absoluteChange.toFixed(2)}{' '}
            ({sign}{snapshot.percentageChange.toFixed(2)}%)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <FreshnessBadge freshness={snapshot.freshness} />
            <span className="text-xs text-slate-500">
              {new Date(snapshot.lastUpdated).toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata',
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Freshness Badge ──────────────────────────────────────────────────────────

import type { DataFreshness } from '../types';

const FRESHNESS_CONFIG: Record<
  DataFreshness,
  { label: string; className: string }
> = {
  live:           { label: 'Live',          className: 'bg-green-500/20 text-green-400' },
  delayed:        { label: '~15 min delay', className: 'bg-blue-500/20 text-blue-400' },
  market_closed:  { label: 'Market closed', className: 'bg-slate-600/40 text-slate-400' },
  offline_cached: { label: 'Offline cache', className: 'bg-yellow-500/20 text-yellow-400' },
  stale:          { label: 'Stale',         className: 'bg-orange-500/20 text-orange-400' },
  unknown:        { label: 'Unknown',       className: 'bg-slate-600/40 text-slate-400' },
};

function FreshnessBadge({ freshness }: { freshness: DataFreshness }) {
  const config = FRESHNESS_CONFIG[freshness];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
