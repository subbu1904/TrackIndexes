import { useEffect, useRef, useState } from 'react';
import { getCatalogByCategory } from '../../indexes/catalog/indexCatalog';
import { usePreferencesStore } from '../store/usePreferencesStore';
import {
  exportPersistedState,
  importPersistedState,
  clearPersistedState,
  createDefaultWorkspace,
  saveAppState,
} from '../persistence/hydrate';
import { CURRENT_WORKSPACE_VERSION, type AlertMode } from '../types';
import { StatusNotice } from '../../../shared/ui/StatusNotice';

interface SettingsPanelProps {
  onClose: () => void;
}

/**
 * SettingsPanel — index selection and data management actions.
 * Per LoginFreePersist.md: export/import/reset are visible but secondary.
 */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const {
    selectedIndexIds,
    alerts,
    toggleIndex,
    hydrate,
    setAlertEnabled,
    setAlertMode,
    setAlertThresholdPoints,
  } = usePreferencesStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{
    tone: 'info' | 'success' | 'error';
    message: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(String(alerts.thresholdPoints));

  const catalog = getCatalogByCategory();
  const supportsBrowserNotifications = typeof Notification !== 'undefined';

  useEffect(() => {
    setThresholdInput(String(alerts.thresholdPoints));
  }, [alerts.thresholdPoints]);

  function handleExport() {
    const preferences = {
      selectedIndexIds,
      theme: usePreferencesStore.getState().theme,
      alerts,
    };
    exportPersistedState({
      version: CURRENT_WORKSPACE_VERSION,
      preferences,
      savedAt: Date.now(),
    });
    setStatus({
      tone: 'success',
      message: 'Backup download started. Check your browser downloads if it does not appear immediately.',
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setStatus({
        tone: 'info',
        message: 'No file selected. Choose a TrackIndexes backup JSON file to restore your saved indexes.',
      });
      return;
    }

    setIsImporting(true);
    setStatus({
      tone: 'info',
      message: `Importing ${file.name}...`,
    });

    try {
      const raw = await file.text();
      const workspace = importPersistedState(raw);
      hydrate(workspace.preferences);
      await saveAppState(workspace);
      setStatus({
        tone: 'success',
        message: `Imported ${file.name}. Reopening the app with your saved indexes.`,
      });
      onClose();
    } catch (err) {
      setStatus({
        tone: 'error',
        message: (err as Error).message,
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  }

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    await clearPersistedState();
    const defaults = createDefaultWorkspace();
    hydrate(defaults.preferences);
    await saveAppState(defaults);
    setConfirmReset(false);
    onClose();
  }

  async function handleAlertsEnabledChange(enabled: boolean) {
    setAlertEnabled(enabled);

    if (!enabled) {
      setStatus({
        tone: 'info',
        message: 'Open-app alerts are disabled.',
      });
      return;
    }

    if (!supportsBrowserNotifications) {
      setStatus({
        tone: 'info',
        message: 'Browser notifications are unavailable here. The app will use in-app alerts while open.',
      });
      return;
    }

    if (Notification.permission === 'granted') {
      setStatus({
        tone: 'success',
        message: 'Browser notifications are enabled. Alerts will also continue to work as in-app notices while the app is open.',
      });
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus({
        tone: 'info',
        message: 'Notification permission is blocked in the browser, so the app will use in-app alerts while it stays open.',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setStatus({
        tone: 'success',
        message: 'Browser notifications enabled. Alerts will fire while the app is open.',
      });
      return;
    }

    setStatus({
      tone: 'info',
      message: 'Notification permission was not granted. The app will use in-app alerts while it stays open.',
    });
  }

  function handleAlertModeChange(mode: AlertMode) {
    setAlertMode(mode);
    setStatus({
      tone: 'info',
      message: 'Alert mode updated. Threshold tracking resets for the current app session.',
    });
  }

  function commitThresholdInput() {
    const parsed = Number(thresholdInput);
    const nextThreshold = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : alerts.thresholdPoints;
    setThresholdInput(String(nextThreshold));
    setAlertThresholdPoints(nextThreshold);
    setStatus({
      tone: 'info',
      message: `Alert threshold updated to ${nextThreshold} points.`,
    });
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

        <div className="mt-6 border-t border-slate-700 pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Open-App Alerts
          </p>
          <p className="text-xs leading-5 text-slate-400">
            Alerts work only while this app stays open. If browser notification permission is unavailable,
            TrackIndexes falls back to in-app notices.
          </p>

          <label className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Enable alerts</p>
              <p className="text-xs text-slate-400">Notify when a tracked index rises by your chosen threshold.</p>
            </div>
            <input
              type="checkbox"
              checked={alerts.enabled}
              onChange={(e) => void handleAlertsEnabledChange(e.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trigger Mode
            </span>
            <select
              value={alerts.mode}
              onChange={(e) => handleAlertModeChange(e.target.value as AlertMode)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="since_app_open">Since app open</option>
              <option value="since_previous_fetch">Since previous fetch</option>
              <option value="since_previous_close">Since previous close</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Threshold Points
            </span>
            <input
              type="number"
              min={1}
              step={10}
              inputMode="numeric"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              onBlur={commitThresholdInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitThresholdInput();
                }
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
          </label>
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
            onClick={() => {
              setStatus({
                tone: 'info',
                message: 'Choose a TrackIndexes backup JSON file to import.',
              });
              fileInputRef.current?.click();
            }}
            disabled={isImporting}
            className="w-full rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:border-slate-400 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? 'Importing backup...' : 'Import from file'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />

          {status && <StatusNotice tone={status.tone} message={status.message} />}

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
