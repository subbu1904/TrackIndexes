import { useEffect, useState, type ReactNode } from 'react';
import { ResumePrompt } from './ResumePrompt';
import { resolveStartupMode, type StartupMode } from './startupPolicy';
import { usePreferencesStore } from '../preferences/store/usePreferencesStore';
import {
  readSessionMetadata,
  hydrateAppState,
  saveAppState,
  clearPersistedState,
  importPersistedState,
  createDefaultWorkspace,
} from '../preferences/persistence/hydrate';
import type { SessionMetadata } from '../preferences/types';

interface StartupGateProps {
  children: ReactNode;
}

/**
 * StartupGate — orchestrates the startup lifecycle per RevisedBuildPlan.md §G:
 *   1. Initialize app shell
 *   2. Resolve persistence strategy
 *   3. Load persisted workspace
 *   4. Apply migrations if needed
 *   5. Determine startup UX from LoginFreePersist.md (via startupPolicy)
 *   6. Render app with restored/default preferences
 *   7. Fetch market data (handled by IndexGrid after gate passes)
 *
 * The ResumePrompt is optional — only rendered when startupPolicy returns 'prompt_resume'.
 * The architecture does not depend on it existing.
 */
export function StartupGate({ children }: StartupGateProps) {
  const [mode, setMode] = useState<StartupMode | 'loading'>('loading');
  const [metadata, setMetadata] = useState<SessionMetadata | null>(null);
  const hydrateStore = usePreferencesStore((s) => s.hydrate);

  useEffect(() => {
    async function init() {
      const meta = readSessionMetadata();
      setMetadata(meta);
      const resolved = resolveStartupMode(meta);

      if (resolved === 'fresh') {
        // First visit — initialize with defaults immediately
        const defaults = createDefaultWorkspace();
        hydrateStore(defaults.preferences.selectedIndexIds);
        await saveAppState(defaults);
        setMode('fresh');
        return;
      }

      if (resolved === 'silent_resume') {
        // Restore without prompting
        const workspace = await hydrateAppState();
        hydrateStore(
          workspace?.preferences.selectedIndexIds ?? createDefaultWorkspace().preferences.selectedIndexIds
        );
        setMode('silent_resume');
        return;
      }

      // 'prompt_resume' — show the decision screen
      setMode('prompt_resume');
    }

    init();
  }, [hydrateStore]);

  async function handleResume() {
    const workspace = await hydrateAppState();
    hydrateStore(
      workspace?.preferences.selectedIndexIds ?? createDefaultWorkspace().preferences.selectedIndexIds
    );
    setMode('silent_resume'); // gate passes
  }

  async function handleStartAfresh() {
    await clearPersistedState();
    const defaults = createDefaultWorkspace();
    hydrateStore(defaults.preferences.selectedIndexIds);
    await saveAppState(defaults);
    setMode('fresh'); // gate passes
  }

  async function handleImport(file: File) {
    const text = await file.text();
    try {
      const workspace = importPersistedState(text);
      hydrateStore(workspace.preferences.selectedIndexIds);
      await saveAppState(workspace);
      setMode('silent_resume'); // gate passes
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }

  // Loading spinner while startup resolves
  if (mode === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {mode === 'prompt_resume' && metadata && (
        <ResumePrompt
          metadata={metadata}
          onResume={handleResume}
          onStartAfresh={handleStartAfresh}
          onImport={handleImport}
        />
      )}
      {/* Children render in all modes; the prompt overlays them when needed */}
      {children}
    </>
  );
}
