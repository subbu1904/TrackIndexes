import type { IndexDefinition, IndexSnapshot } from '../types';
import { formatAbsoluteChange, formatNumber } from '../../../shared/lib/formatNumber';
import { formatPercent } from '../../../shared/lib/formatPercent';
import { formatDateTime } from '../../../shared/lib/formatTime';
import { FreshnessBadge } from './IndexCard';

interface IndexDetailSheetProps {
  definition: IndexDefinition;
  snapshot?: IndexSnapshot;
  errorReason?: string;
  onClose: () => void;
}

export function IndexDetailSheet({
  definition,
  snapshot,
  errorReason,
  onClose,
}: IndexDetailSheetProps) {
  const hasSnapshot = !!snapshot;
  const isPositive = (snapshot?.absoluteChange ?? 0) >= 0;
  const changeTone = isPositive ? 'text-emerald-300' : 'text-red-300';

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/80 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close index details"
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {definition.category ?? 'Index'}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-100">{definition.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{definition.symbol}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        {hasSnapshot ? (
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-4xl font-bold tabular-nums text-slate-100">
                {formatNumber(snapshot.value)}
              </p>
              <p className={`mt-2 text-sm font-medium tabular-nums ${changeTone}`}>
                {isPositive ? '▲' : '▼'} {formatAbsoluteChange(snapshot.absoluteChange)} (
                {formatPercent(snapshot.percentageChange)})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <FreshnessBadge freshness={snapshot.freshness} />
              <span className="text-sm text-slate-400">{snapshot.source}</span>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900/60 px-4 py-3">
                <dt className="text-slate-400">Market timestamp</dt>
                <dd className="text-right text-slate-100">{formatDateTime(snapshot.lastUpdated)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900/60 px-4 py-3">
                <dt className="text-slate-400">Fetched by app</dt>
                <dd className="text-right text-slate-100">{formatDateTime(snapshot.fetchedAt)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4">
            <p className="text-sm font-medium text-red-300">This index could not be loaded.</p>
            {errorReason && <p className="mt-2 text-sm text-slate-300">{errorReason}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
