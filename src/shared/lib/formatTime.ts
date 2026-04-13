/** Format a Unix timestamp (ms) as a time string in IST. e.g. → "3:30 PM" */
export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(timestamp));
}

/** Format a Unix timestamp (ms) as a full date-time string in IST. */
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

/** Returns true if the given timestamp is older than thresholdMinutes. */
export function isStale(timestamp: number, thresholdMinutes = 15): boolean {
  return Date.now() - timestamp > thresholdMinutes * 60 * 1000;
}
