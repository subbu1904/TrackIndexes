import { create } from 'zustand';
import { saveAppState } from '../persistence/hydrate';
import {
  CURRENT_WORKSPACE_VERSION,
  DEFAULT_ALERT_PREFERENCES,
  type AlertMode,
  type DisplayPreferences,
} from '../types';

// Debounce helper to avoid excessive writes on rapid state changes
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function buildPreferences(state: Pick<PreferencesState, 'selectedIndexIds' | 'theme' | 'alerts'>): DisplayPreferences {
  return {
    selectedIndexIds: state.selectedIndexIds,
    theme: state.theme,
    alerts: state.alerts,
  };
}

function debouncedSave(preferences: DisplayPreferences, delayMs = 500) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveAppState({
      version: CURRENT_WORKSPACE_VERSION,
      preferences,
      savedAt: Date.now(),
    });
  }, delayMs);
}

interface PreferencesState {
  selectedIndexIds: string[];
  theme: DisplayPreferences['theme'];
  alerts: DisplayPreferences['alerts'];

  /** Replace the full selection (called on hydration/import). */
  hydrate: (preferences: DisplayPreferences) => void;
  /** Toggle a single index on/off. Persists after debounce. */
  toggleIndex: (id: string) => void;
  /** Replace the full selection. Persists after debounce. */
  setSelectedIndexIds: (ids: string[]) => void;
  setAlertEnabled: (enabled: boolean) => void;
  setAlertMode: (mode: AlertMode) => void;
  setAlertThresholdPoints: (thresholdPoints: number) => void;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  selectedIndexIds: [],
  theme: 'dark',
  alerts: DEFAULT_ALERT_PREFERENCES,

  hydrate(preferences) {
    set({
      selectedIndexIds: preferences.selectedIndexIds,
      theme: preferences.theme ?? 'dark',
      alerts: preferences.alerts,
    });
    // Persist immediately on hydration to refresh the metadata timestamp
    saveAppState({
      version: CURRENT_WORKSPACE_VERSION,
      preferences,
      savedAt: Date.now(),
    });
  },

  toggleIndex(id) {
    const current = get().selectedIndexIds;
    const updated = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    set({ selectedIndexIds: updated });
    debouncedSave(buildPreferences({ ...get(), selectedIndexIds: updated }));
  },

  setSelectedIndexIds(ids) {
    set({ selectedIndexIds: ids });
    debouncedSave(buildPreferences({ ...get(), selectedIndexIds: ids }));
  },

  setAlertEnabled(enabled) {
    set((state) => ({
      alerts: {
        ...state.alerts,
        enabled,
      },
    }));
    debouncedSave(buildPreferences(get()));
  },

  setAlertMode(mode) {
    set((state) => ({
      alerts: {
        ...state.alerts,
        mode,
      },
    }));
    debouncedSave(buildPreferences(get()));
  },

  setAlertThresholdPoints(thresholdPoints) {
    const normalized = Math.max(1, Math.round(thresholdPoints));
    set((state) => ({
      alerts: {
        ...state.alerts,
        thresholdPoints: normalized,
      },
    }));
    debouncedSave(buildPreferences(get()));
  },
}));
