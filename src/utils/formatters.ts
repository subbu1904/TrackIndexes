/**
 * Format a numeric index value with Indian locale comma grouping.
 * e.g. 24050.60 → "24,050.60"
 */
export function formatValue(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format an absolute change value with a leading sign.
 * e.g. 275.5 → "+275.50"  |  -120.3 → "-120.30"
 */
export function formatAbsoluteChange(change: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(change));
  return change >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Format a percentage change with a leading sign and % suffix.
 * e.g. 1.16 → "+1.16%"  |  -0.5 → "-0.50%"
 */
export function formatPercentageChange(pct: number): string {
  const formatted = Math.abs(pct).toFixed(2);
  return pct >= 0 ? `+${formatted}%` : `-${formatted}%`;
}

/**
 * Format a Unix timestamp (ms) as a human-readable time string.
 * e.g. 1712900400000 → "3:30 PM"
 */
export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(timestamp));
}

/**
 * Format a Unix timestamp (ms) as a full date-time string.
 * e.g. → "Apr 11, 2026, 3:30 PM IST"
 */
export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
    timeZoneName: 'short',
  }).format(new Date(timestamp));
}

/**
 * Returns true if the given timestamp is older than `thresholdMinutes`.
 */
export function isStale(timestamp: number, thresholdMinutes = 15): boolean {
  return Date.now() - timestamp > thresholdMinutes * 60 * 1000;
}
