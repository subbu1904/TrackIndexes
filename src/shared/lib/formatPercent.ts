/** Format a percentage change with a leading sign and % suffix. e.g. 1.16 → "+1.16%" */
export function formatPercent(pct: number): string {
  const formatted = Math.abs(pct).toFixed(2);
  return pct >= 0 ? `+${formatted}%` : `-${formatted}%`;
}
