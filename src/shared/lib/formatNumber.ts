/** Format a numeric value with Indian locale comma grouping. e.g. 24050.60 → "24,050.60" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format an absolute change with a leading sign. e.g. 275.5 → "+275.50" */
export function formatAbsoluteChange(change: number): string {
  const formatted = Math.abs(change).toFixed(2);
  return change >= 0 ? `+${formatted}` : `-${formatted}`;
}
