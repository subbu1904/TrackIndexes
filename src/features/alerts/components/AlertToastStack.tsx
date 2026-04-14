interface AlertToast {
  id: string;
  title: string;
  message: string;
}

interface AlertToastStackProps {
  toasts: AlertToast[];
  onDismiss: (toastId: string) => void;
}

export function AlertToastStack({ toasts, onDismiss }: AlertToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-full max-w-md rounded-xl border border-blue-400/30 bg-slate-900/95 p-4 shadow-2xl ring-1 ring-blue-500/20 backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-300">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:text-slate-100"
              aria-label="Dismiss alert"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
