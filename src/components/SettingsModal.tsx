import { useRef, useState } from 'react';
import { getCatalogByCategory } from '../utils/catalog';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { exportWorkspace, parseImportedFile } from '../store/persistence';

interface SettingsModalProps {
  onClose: () => void;
}

/**
 * SettingsModal — allows the user to:
 *   - Toggle which indexes appear on the landing page.
 *   - Export their preferences as a backup JSON file.
 *   - Import a previously exported backup.
 *   - Reset all saved progress.
 *
 * Per LoginFreePersist.md: export/import/reset are visible but secondary to the main UI.
 */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const { selectedIndexes, toggleIndex, hydrate, reset } = useWorkspaceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const catalog = getCatalogByCategory();

  function handleExport() {
    exportWorkspace(useWorkspaceStore.getState());
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const workspace = parseImportedFile(ev.target?.result as string);
        hydrate(workspace);
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
    await reset();
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
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Manage Indexes</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-100"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Index toggles grouped by category */}
        <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
          {Object.entries(catalog).map(([category, indexes]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {category}
              </p>
              <div className="space-y-1">
                {indexes.map((idx) => {
                  const isSelected = selectedIndexes.includes(idx.id);
                  return (
                    <label
                      key={idx.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-elevated"
                    >
                      <span className="text-sm text-slate-200">{idx.name}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleIndex(idx.id)}
                        className="h-4 w-4 accent-brand"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Data management actions */}
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

          {importError && (
            <p className="text-xs text-loss">{importError}</p>
          )}

          <button
            onClick={handleReset}
            className={`w-full rounded-lg py-2 text-sm transition ${
              confirmReset
                ? 'bg-loss/20 text-loss font-semibold'
                : 'text-slate-500 hover:text-loss'
            }`}
          >
            {confirmReset ? 'Tap again to confirm reset' : 'Reset saved progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
