import { useEffect, useState } from 'react';

/**
 * OfflineBanner — displays a non-intrusive banner when the device is offline.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 w-full bg-yellow-500/20 px-4 py-2 text-center text-xs font-medium text-yellow-300"
    >
      You are offline. Showing last cached data.
    </div>
  );
}
