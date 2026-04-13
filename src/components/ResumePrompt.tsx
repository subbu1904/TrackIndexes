import { useRef } from 'react';
import { formatDateTime } from '../utils/formatters';
import type { SessionMetadata } from '../types';

interface ResumePromptProps {
  metadata: SessionMetadata;
  onResume: () => void;
  onStartAfresh: () => void;
  onImport: (file: File) => void;
}

/**
 * ResumePrompt — the decision screen shown to returning users.
 * Per LoginFreePersist.md: "Resume where I left off", "Start afresh", "Import from file".
 * The destructive action (Start afresh) is visually de-emphasised.
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl">
        <h1 className="text-lg font-semibold text-slate-100">
          We found saved progress on this device.
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Last saved on {formatDateTime(metadata.lastUpdated)}.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {/* Primary action — Resume */}
          <button
            onClick={onResume}
            className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand"
          >
            Resume — Continue from where you left off
          </button>

          {/* Secondary action — Import */}
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

          {/* Destructive action — Start afresh */}
          <button
            onClick={onStartAfresh}
            className="w-full rounded-lg py-2 text-sm text-slate-500 transition hover:text-loss"
          >
            Start afresh — Clear saved progress
          </button>
        </div>
      </div>
    </div>
  );
}
