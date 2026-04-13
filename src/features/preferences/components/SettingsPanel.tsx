import { useRef, useState } from 'react';
import { getCatalogByCategory } from '../../indexes/catalog/indexCatalog';
import { usePreferencesStore } from '../store/usePreferencesStore';
import {
  exportPersistedState,
  importPersistedState,
  clearPersistedState,
  createDefaultWorkspace,
  saveAppState,
} from '../persistence/hydrate';
import { CURRENT_WORKSPACE_VERSION } from '../types';

interface SettingsPanelProps {
  onClose: () => void;
}

/**
 * SettingsPanel — index selection and data management actions.
 * Per LoginFreePersist.md: export/import/reset are visible but secondary.
 */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { selectedIndexIds, toggleIndex, hydrate } = usePreferencesStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const catalog = getCatalogByCategory();

  function handleExport() {
    exportPersistedState({
      version: CURRENT_WORKSPACE_VERSION,
      preferences: { selectedIndexIds },
      savedAt: Date.now(),
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const workspace = importPersistedState(ev.target?.result as string);
        hydrate(workspace.preferences.selectedIndexIds);
        await saveAppState(workspace);
        onClose();
      } catch (err) {
        setImportError((err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await clearPersistedState();
    const defaults = createDefaultWorkspace();
    hydrate(defaults.preferences.selectedIndexIds);
    await saveAppState(defaults);
    setConfirmReset(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-slate-800 p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Customize Indexes</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-100"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Index toggles */}
        <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
          {Object.entries(catalog).map(([category, indexes]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {category}
              </p>
              <div className="space-y-1">
                {indexes.map((idx) => (
                  <label
                    key={idx.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-700"
                  >
                    <span className="text-sm text-slate-200">{idx.name}</span>
                    <input
                      type="checkbox"
                      checked={selectedIndexIds.includes(idx.id)}
                      onChange={() => toggleIndex(idx.id)}
                      className="h-4 w-4 accent-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Data management */}
        <div className="mt-6 border-t border-slate-700 pt-4 space-y-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Data Management
          </p>

          <button
            onClick={handleExport}
            className="w-full rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:border-slate-400 hover:text-slate-100"
          >
            Download backup
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:border-slate-400 hover:text-slate-100"
          >
            Import from file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />

          {importError && <p className="text-xs text-red-400">{importError}</p>}

          <button
            onClick={handleReset}
            className={`w-full rounded-lg py-2 text-sm transition ${
              confirmReset
                ? 'bg-red-500/20 font-semibold text-red-400'
                : 'text-slate-500 hover:text-red-400'
            }`}
          >
            {confirmReset ? 'Tap again to confirm reset' : 'Reset saved progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
