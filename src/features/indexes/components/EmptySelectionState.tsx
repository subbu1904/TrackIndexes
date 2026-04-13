interface EmptySelectionStateProps {
  onOpenSettings: () => void;
}

/**
 * EmptySelectionState — shown when the user has no indexes selected.
 */
export function EmptySelectionState({ onOpenSettings }: EmptySelectionStateProps) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <p className="text-4xl">📊</p>
      <p className="mt-4 text-base font-medium text-slate-300">No indexes selected</p>
      <p className="mt-1 text-sm text-slate-500">
        Tap <strong>Customize</strong> to choose which indexes to display.
      </p>
      <button
        onClick={onOpenSettings}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Customize
      </button>
    </div>
  );
}
