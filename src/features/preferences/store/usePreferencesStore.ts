import { create } from 'zustand';
import { saveAppState } from '../persistence/hydrate';
import { CURRENT_WORKSPACE_VERSION } from '../types';

// Debounce helper to avoid excessive writes on rapid state changes
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(ids: string[], delayMs = 500) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveAppState({
      version: CURRENT_WORKSPACE_VERSION,
      preferences: { selectedIndexIds: ids },
      savedAt: Date.now(),
    });
  }, delayMs);
}

interface PreferencesState {
  selectedIndexIds: string[];

  /** Replace the full selection (called on hydration/import). */
  hydrate: (ids: string[]) => void;
  /** Toggle a single index on/off. Persists after debounce. */
  toggleIndex: (id: string) => void;
  /** Replace the full selection. Persists after debounce. */
  setSelectedIndexIds: (ids: string[]) => void;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  selectedIndexIds: [],

  hydrate(ids) {
    set({ selectedIndexIds: ids });
    // Persist immediately on hydration to refresh the metadata timestamp
    saveAppState({
      version: CURRENT_WORKSPACE_VERSION,
      preferences: { selectedIndexIds: ids },
      savedAt: Date.now(),
    });
  },

  toggleIndex(id) {
    const current = get().selectedIndexIds;
    const updated = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    set({ selectedIndexIds: updated });
    debouncedSave(updated);
  },

  setSelectedIndexIds(ids) {
    set({ selectedIndexIds: ids });
    debouncedSave(ids);
  },
}));
