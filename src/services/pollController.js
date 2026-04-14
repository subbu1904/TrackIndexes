import { fetchMarketSnapshot } from "./marketDataService.js";

const DEFAULT_SYMBOLS = ["^NSEI", "^BSESN"];

export function createPollController({
  fetchMarketDataImpl = fetchMarketSnapshot,
  symbols = DEFAULT_SYMBOLS,
  pollIntervalMs = 60_000,
  minRefreshMs = 60_000,
  now = () => Date.now(),
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
  addEventListenerImpl = globalThis.addEventListener?.bind(globalThis),
  removeEventListenerImpl = globalThis.removeEventListener?.bind(globalThis),
  onlineSource = () => globalThis.navigator?.onLine ?? true
} = {}) {
  const listeners = new Set();
  let intervalId = null;
  let lastRefreshAt = 0;
  let inFlight = false;
  let isStarted = false;

  async function handleOnline() {
    if (!isStarted) {
      return;
    }

    await refreshQuotes({ bypassRateLimit: true });
  }

  function emit(event) {
    listeners.forEach((listener) => listener(event));
  }

  async function refreshQuotes({ bypassRateLimit = false } = {}) {
    if (inFlight) {
      return false;
    }

    if (!onlineSource()) {
      emit({ type: "status", status: "offline" });
      return false;
    }

    const currentTime = now();
    if (!bypassRateLimit && lastRefreshAt && currentTime - lastRefreshAt < minRefreshMs) {
      return false;
    }

    inFlight = true;
    emit({ type: "status", status: "loading" });

    try {
      const snapshot = await fetchMarketDataImpl({ symbols });
      lastRefreshAt = currentTime;
      emit({
        type: "update",
        quotes: snapshot.quotes,
        lastUpdatedAt: snapshot.lastUpdatedAt,
        meta: snapshot.meta
      });
      return true;
    } catch (error) {
      emit({ type: "error", error });
      return false;
    } finally {
      inFlight = false;
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async start() {
      if (intervalId !== null) {
        return false;
      }

      isStarted = true;
      intervalId = setIntervalImpl(() => {
        void refreshQuotes();
      }, pollIntervalMs);
      addEventListenerImpl?.("online", handleOnline);

      return refreshQuotes();
    },
    stop() {
      if (intervalId === null) {
        return;
      }

      isStarted = false;
      clearIntervalImpl(intervalId);
      intervalId = null;
      removeEventListenerImpl?.("online", handleOnline);
    },
    async forceRefresh() {
      return refreshQuotes();
    }
  };
}
