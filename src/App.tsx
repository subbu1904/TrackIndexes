import { useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { ResumePrompt } from './components/ResumePrompt';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import {
  readMetadata,
  loadWorkspace,
  DEFAULT_WORKSPACE,
  parseImportedFile,
} from './store/persistence';
import type { SessionMetadata } from './types';

type AppState = 'loading' | 'resume-prompt' | 'ready';

/**
 * App — root component that manages the session lifecycle.
 *
 * Per LoginFreePersist.md load lifecycle:
 *   1. App starts.
 *   2. Check localStorage for resumable metadata.
 *   3. If none, start new workspace (initialize defaults).
 *   4. If state exists, show resume/start fresh/import options.
 *   5. On resume, load and hydrate workspace from IndexedDB.
 *   6. On import, validate and migrate file, then replace workspace.
 */
export function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [metadata, setMetadata] = useState<SessionMetadata | null>(null);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const reset = useWorkspaceStore((s) => s.reset);

  useEffect(() => {
    async function initSession() {
      const meta = readMetadata();

      if (!meta || !meta.workspaceExists) {
        // First visit: initialize with defaults and proceed
        hydrate(DEFAULT_WORKSPACE);
        setAppState('ready');
        return;
      }

      // Returning visit: show the decision screen
      setMetadata(meta);
      setAppState('resume-prompt');
    }

    initSession();
  }, [hydrate]);

  async function handleResume() {
    const workspace = await loadWorkspace();
    hydrate(workspace ?? DEFAULT_WORKSPACE);
    setAppState('ready');
  }

  async function handleStartAfresh() {
    await reset();
    setAppState('ready');
  }

  async function handleImport(file: File) {
    const text = await file.text();
    try {
      const workspace = parseImportedFile(text);
      hydrate(workspace);
      setAppState('ready');
    } catch (err) {
      // Surface error to user — in a real app, use a toast notification
      alert(`Import failed: ${(err as Error).message}`);
    }
  }

  if (appState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {appState === 'resume-prompt' && metadata && (
        <ResumePrompt
          metadata={metadata}
          onResume={handleResume}
          onStartAfresh={handleStartAfresh}
          onImport={handleImport}
        />
      )}
      <LandingPage />
    </>
  );
}
