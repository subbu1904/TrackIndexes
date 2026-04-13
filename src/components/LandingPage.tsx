import { useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { IndexCard } from './IndexCard';
import { SettingsModal } from './SettingsModal';
import { OfflineBanner } from './ui/OfflineBanner';

/**
 * LandingPage — the main screen of the app.
 * Shows the grid of selected index cards and a header with a settings button.
 */
export function LandingPage() {
  const selectedIndexes = useWorkspaceStore((s) => s.selectedIndexes);
  const [showSettings, setShowSettings] = useState(false);

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
          className="rounded-lg bg-surface-elevated px-3 py-2 text-sm text-slate-300 transition hover:text-slate-100"
          aria-label="Open settings"
        >
          ⚙ Manage
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-8">
        {selectedIndexes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="text-4xl">📊</p>
            <p className="mt-4 text-base font-medium text-slate-300">No indexes selected</p>
            <p className="mt-1 text-sm text-slate-500">
              Tap <strong>Manage</strong> above to choose which indexes to display.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedIndexes.map((id) => (
              <IndexCard key={id} indexId={id} />
            ))}
          </div>
        )}
      </main>

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
