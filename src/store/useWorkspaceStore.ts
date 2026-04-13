import { create } from 'zustand';
import type { WorkspaceState } from '../types';
import {
  DEFAULT_WORKSPACE,
  saveWorkspace,
  clearWorkspace,
} from './persistence';

// Debounce helper to avoid excessive IndexedDB writes on rapid state changes
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(state: WorkspaceState, delayMs = 500) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveWorkspace(state), delayMs);
}

interface WorkspaceStore extends WorkspaceState {
  // ── Hydration ──────────────────────────────────────────────────────────────
  /** Replace the entire workspace state (called on resume or import). */
  hydrate: (state: WorkspaceState) => void;
  /** Reset to defaults and clear all persisted data. */
  reset: () => Promise<void>;

  // ── Index Selection ────────────────────────────────────────────────────────
  toggleIndex: (id: string) => void;
  setSelectedIndexes: (ids: string[]) => void;

  // ── Theme ──────────────────────────────────────────────────────────────────
  setTheme: (theme: WorkspaceState['theme']) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  ...DEFAULT_WORKSPACE,

  hydrate(state) {
    set(state);
    // Persist immediately on hydration to refresh the metadata timestamp
    saveWorkspace(state);
  },

  async reset() {
    await clearWorkspace();
    set(DEFAULT_WORKSPACE);
  },

  toggleIndex(id) {
    const current = get().selectedIndexes;
    const updated = current.includes(id)
      ? current.filter((i) => i !== id)
      : [...current, id];
    set({ selectedIndexes: updated });
    debouncedSave(get());
  },

  setSelectedIndexes(ids) {
    set({ selectedIndexes: ids });
    debouncedSave(get());
  },

  setTheme(theme) {
    set({ theme });
    debouncedSave(get());
  },
}));
