import type { DataFreshness, IndexSnapshot } from '../types';
import { formatAbsoluteChange, formatNumber } from '../../../shared/lib/formatNumber';
import { formatPercent } from '../../../shared/lib/formatPercent';
import { formatTime } from '../../../shared/lib/formatTime';

interface IndexCardProps {
  name: string;
  snapshot?: IndexSnapshot;
  isLoading?: boolean;
  isError?: boolean;
  errorReason?: string;
  onSelect?: () => void;
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
  onSelect,
}: IndexCardProps) {
  const isPositive = (snapshot?.absoluteChange ?? 0) >= 0;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
  const borderColor = isPositive ? 'border-green-500/20' : 'border-red-500/20';
  const interactive = !!onSelect && !isLoading;
  const cardClassName = `relative w-full rounded-2xl border bg-slate-800 p-4 text-left shadow-sm transition ${
    interactive
      ? 'cursor-pointer hover:border-slate-500 hover:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500'
      : ''
  } ${borderColor}`;
  const content = (
    <>
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
            {formatNumber(snapshot.value)}
          </p>
          <p className={`mt-1 text-sm font-medium tabular-nums ${changeColor}`}>
            {isPositive ? '▲' : '▼'}{' '}
            {formatAbsoluteChange(snapshot.absoluteChange)}{' '}
            ({formatPercent(snapshot.percentageChange)})
          </p>
          <div className="mt-2 flex items-center gap-2">
            <FreshnessBadge freshness={snapshot.freshness} />
            <span className="text-xs text-slate-500">{formatTime(snapshot.lastUpdated)}</span>
          </div>
        </div>
      )}

      {interactive && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Tap for details</span>
          <span aria-hidden="true">›</span>
        </div>
      )}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cardClassName}
        aria-label={`Open details for ${name}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cardClassName} aria-label={`${name} index card`}>
      {content}
    </div>
  );
}

// ─── Freshness Badge ──────────────────────────────────────────────────────────

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

export function FreshnessBadge({ freshness }: { freshness: DataFreshness }) {
  const config = FRESHNESS_CONFIG[freshness];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
