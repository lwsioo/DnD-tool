import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useToastStore, type Toast } from '@/stores/toastStore';
import { m } from '@/i18n';

const ICONS = { info: Info, success: CheckCircle2, error: AlertTriangle };

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[toast.tone];

  useEffect(() => {
    if (!toast.duration) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2 text-sm shadow-xl"
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          toast.tone === 'success' && 'text-ok',
          toast.tone === 'error' && 'text-danger',
          toast.tone === 'info' && 'text-accent',
        )}
        aria-hidden
      />
      <span className="flex-1 whitespace-pre-line">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            dismiss(toast.id);
            void toast.action!.onClick();
          }}
          className="font-semibold text-accent hover:underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label={m.common.closeToast}
        onClick={() => dismiss(toast.id)}
        className="text-muted hover:text-ink"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** Notifiche in basso al centro (es. "Personaggio eliminato · Annulla"). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
