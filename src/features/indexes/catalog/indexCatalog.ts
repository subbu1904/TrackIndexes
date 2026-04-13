import type { IndexDefinition } from '../types';

/**
 * Master catalog of trackable Indian market indexes.
 * Add new entries here to extend coverage; no other changes required.
 * Symbols follow Yahoo Finance conventions.
 *
 * IDs use lowercase slugs to match the revised data model.
 */
export const INDEX_CATALOG: IndexDefinition[] = [
  // ── Broad Market ──────────────────────────────────────────────────────────
  {
    id: 'nifty50',
    symbol: '^NSEI',
    name: 'NIFTY 50',
    category: 'Broad Market',
    enabledByDefault: true,
  },
  {
    id: 'sensex',
    symbol: '^BSESN',
    name: 'S&P BSE SENSEX',
    category: 'Broad Market',
    enabledByDefault: true,
  },
  {
    id: 'niftynext50',
    symbol: '^NSMIDCP',
    name: 'NIFTY Next 50',
    category: 'Broad Market',
  },

  // ── Sectoral ──────────────────────────────────────────────────────────────
  {
    id: 'niftybank',
    symbol: '^NSEBANK',
    name: 'NIFTY Bank',
    category: 'Sectoral',
    enabledByDefault: true,
  },
  {
    id: 'niftyit',
    symbol: '^CNXIT',
    name: 'NIFTY IT',
    category: 'Sectoral',
    enabledByDefault: true,
  },
  {
    id: 'niftyfmcg',
    symbol: '^CNXFMCG',
    name: 'NIFTY FMCG',
    category: 'Sectoral',
  },
  {
    id: 'niftypharma',
    symbol: '^CNXPHARMA',
    name: 'NIFTY Pharma',
    category: 'Sectoral',
  },
  {
    id: 'niftyauto',
    symbol: '^CNXAUTO',
    name: 'NIFTY Auto',
    category: 'Sectoral',
  },
  {
    id: 'niftymetal',
    symbol: '^CNXMETAL',
    name: 'NIFTY Metal',
    category: 'Sectoral',
  },
  {
    id: 'niftyrealty',
    symbol: '^CNXREALTY',
    name: 'NIFTY Realty',
    category: 'Sectoral',
  },

  // ── Market Cap ────────────────────────────────────────────────────────────
  {
    id: 'niftymidcap',
    symbol: '^NSEMDCP50',
    name: 'NIFTY Midcap 100',
    category: 'Market Cap',
  },
  {
    id: 'niftysmallcap',
    symbol: '^CNXSC',
    name: 'NIFTY Smallcap 100',
    category: 'Market Cap',
  },
];

/** IDs enabled by default (used on first launch and as fallback). */
export const DEFAULT_INDEX_IDS: string[] = INDEX_CATALOG
  .filter((x) => x.enabledByDefault)
  .map((x) => x.id);

/** Look up a definition by ID. Returns undefined if not found. */
export function getIndexById(id: string): IndexDefinition | undefined {
  return INDEX_CATALOG.find((x) => x.id === id);
}

/** Group the catalog by category for display in the settings UI. */
export function getCatalogByCategory(): Record<string, IndexDefinition[]> {
  return INDEX_CATALOG.reduce<Record<string, IndexDefinition[]>>((acc, idx) => {
    const cat = idx.category ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(idx);
    return acc;
  }, {});
}
