import type { IndexDefinition } from '../types';

/**
 * Master catalog of trackable Indian market indexes.
 * Add new entries here to extend coverage; no other changes required.
 * Symbols follow Yahoo Finance conventions.
 */
export const INDEX_CATALOG: IndexDefinition[] = [
  // ── Broad Market ──────────────────────────────────────────────────────────
  {
    id: 'NIFTY_50',
    symbol: '^NSEI',
    name: 'NIFTY 50',
    category: 'Broad Market',
  },
  {
    id: 'SENSEX',
    symbol: '^BSESN',
    name: 'S&P BSE SENSEX',
    category: 'Broad Market',
  },
  {
    id: 'NIFTY_NEXT_50',
    symbol: '^NSMIDCP',
    name: 'NIFTY Next 50',
    category: 'Broad Market',
  },

  // ── Sectoral ──────────────────────────────────────────────────────────────
  {
    id: 'NIFTY_BANK',
    symbol: '^NSEBANK',
    name: 'NIFTY Bank',
    category: 'Sectoral',
  },
  {
    id: 'NIFTY_IT',
    symbol: '^CNXIT',
    name: 'NIFTY IT',
    category: 'Sectoral',
  },
  {
    id: 'NIFTY_FMCG',
    symbol: '^CNXFMCG',
    name: 'NIFTY FMCG',
    category: 'Sectoral',
  },
  {
    id: 'NIFTY_PHARMA',
    symbol: '^CNXPHARMA',
    name: 'NIFTY Pharma',
    category: 'Sectoral',
  },
  {
    id: 'NIFTY_AUTO',
    symbol: '^CNXAUTO',
    name: 'NIFTY Auto',
    category: 'Sectoral',
  },
  {
    id: 'NIFTY_METAL',
    symbol: '^CNXMETAL',
    name: 'NIFTY Metal',
    category: 'Sectoral',
  },
  {
    id: 'NIFTY_REALTY',
    symbol: '^CNXREALTY',
    name: 'NIFTY Realty',
    category: 'Sectoral',
  },

  // ── Market Cap ────────────────────────────────────────────────────────────
  {
    id: 'NIFTY_MIDCAP_100',
    symbol: '^NSEMDCP50',
    name: 'NIFTY Midcap 100',
    category: 'Market Cap',
  },
  {
    id: 'NIFTY_SMALLCAP_100',
    symbol: '^CNXSC',
    name: 'NIFTY Smallcap 100',
    category: 'Market Cap',
  },
];

/** IDs shown by default on first launch. */
export const DEFAULT_SELECTED_INDEXES: string[] = [
  'NIFTY_50',
  'SENSEX',
  'NIFTY_BANK',
  'NIFTY_IT',
];

/** Look up a definition by ID. Returns undefined if not found. */
export function getIndexById(id: string): IndexDefinition | undefined {
  return INDEX_CATALOG.find((idx) => idx.id === id);
}

/** Group the catalog by category for display in the settings UI. */
export function getCatalogByCategory(): Record<string, IndexDefinition[]> {
  return INDEX_CATALOG.reduce<Record<string, IndexDefinition[]>>((acc, idx) => {
    if (!acc[idx.category]) acc[idx.category] = [];
    acc[idx.category].push(idx);
    return acc;
  }, {});
}
