type StatusTone = 'info' | 'success' | 'error';

interface StatusNoticeProps {
  message: string;
  tone?: StatusTone;
}

const TONE_STYLES: Record<StatusTone, string> = {
  info: 'border-slate-600 bg-slate-700/50 text-slate-300',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
};

export function StatusNotice({ message, tone = 'info' }: StatusNoticeProps) {
  return (
    <p className={`rounded-lg border px-3 py-2 text-xs ${TONE_STYLES[tone]}`}>
      {message}
    </p>
  );
}
