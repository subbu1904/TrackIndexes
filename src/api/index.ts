import { MockProvider } from './mockProvider';
import { YahooFinanceProvider } from './yahooProvider';
import type { IndexDataProvider } from './provider';

/**
 * The active data provider for the application.
 *
 * To switch to live data:
 *   1. Deploy the Cloudflare Worker proxy (see /proxy/worker.ts).
 *   2. Set VITE_PROXY_URL in your .env file.
 *   3. The factory below will automatically use YahooFinanceProvider.
 *
 * During development or when VITE_PROXY_URL is not set, MockProvider is used.
 */
function createProvider(): IndexDataProvider {
  const proxyUrl = import.meta.env.VITE_PROXY_URL as string | undefined;

  if (proxyUrl) {
    console.info(`[TrackIndexes] Using YahooFinanceProvider via proxy: ${proxyUrl}`);
    return new YahooFinanceProvider(proxyUrl);
  }

  console.info('[TrackIndexes] VITE_PROXY_URL not set. Using MockProvider.');
  return new MockProvider({ delayMs: 800 });
}

export const dataProvider: IndexDataProvider = createProvider();
