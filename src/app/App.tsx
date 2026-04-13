import { useState } from 'react';
import { StartupGate } from '../features/startup/StartupGate';
import { IndexGrid } from '../features/indexes/components/IndexGrid';
import { EmptySelectionState } from '../features/indexes/components/EmptySelectionState';
import { SettingsPanel } from '../features/preferences/components/SettingsPanel';
import { OfflineBanner } from '../shared/ui/OfflineBanner';
import { usePreferencesStore } from '../features/preferences/store/usePreferencesStore';
import { dataProvider } from './providers';
import { DEFAULT_INDEX_IDS } from '../features/indexes/catalog/indexCatalog';

/**
 * Inner app content — rendered after StartupGate resolves.
 * Uses the preferences store to determine which indexes to display.
 */
function AppContent() {
  const selectedIndexIds = usePreferencesStore((s) => s.selectedIndexIds);
  const [showSettings, setShowSettings] = useState(false);

  // Fall back to defaults if store is empty (e.g. during first hydration tick)
  const displayIds =
    selectedIndexIds.length > 0 ? selectedIndexIds : DEFAULT_INDEX_IDS;

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <OfflineBanner />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">TrackIndexes</h1>
          <p className="text-xs text-slate-500">Indian Market at a Glance</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:text-slate-100"
          aria-label="Open settings"
        >
          ⚙ Customize
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-8">
        {selectedIndexIds.length === 0 ? (
          <EmptySelectionState onOpenSettings={() => setShowSettings(true)} />
        ) : (
          <IndexGrid provider={dataProvider} indexIds={displayIds} />
        )}
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

/**
 * App root — wraps AppContent with the StartupGate.
 * The gate handles the full startup lifecycle (fresh / silent resume / prompt resume)
 * before rendering the main UI.
 */
export default function App() {
  return (
    <StartupGate>
      <AppContent />
    </StartupGate>
  );
}
