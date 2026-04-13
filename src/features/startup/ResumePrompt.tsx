import { useRef } from 'react';
import type { SessionMetadata } from '../preferences/types';

interface ResumePromptProps {
  metadata: SessionMetadata;
  onResume: () => void;
  onStartAfresh: () => void;
  onImport: (file: File) => void;
}

/**
 * ResumePrompt — the optional decision screen shown to returning users.
 * Per LoginFreePersist.md §Proposed UX:
 *   "Resume where I left off" | "Start afresh" | "Import from file"
 *
 * Only rendered when startupPolicy resolves to 'prompt_resume'.
 * The rest of the architecture does not depend on this screen existing.
 */
export function ResumePrompt({
  metadata,
  onResume,
  onStartAfresh,
  onImport,
}: ResumePromptProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImport(file);
  }

  const lastSaved = new Date(metadata.lastSavedAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-2xl">
        <h1 className="text-lg font-semibold text-slate-100">
          We found saved progress on this device.
        </h1>
        <p className="mt-1 text-sm text-slate-400">Last saved on {lastSaved}.</p>

        <div className="mt-6 flex flex-col gap-3">
          {/* Primary — Resume */}
          <button
            onClick={onResume}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Resume — Continue from where you left off
          </button>

          {/* Secondary — Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-slate-600 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
          >
            Import from file — Restore from a backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Destructive — Start afresh */}
          <button
            onClick={onStartAfresh}
            className="w-full rounded-lg py-2 text-sm text-slate-500 transition hover:text-red-400"
          >
            Start afresh — Clear saved progress
          </button>
        </div>
      </div>
    </div>
  );
}
