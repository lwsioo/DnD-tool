import { AlertTriangle, Check, LoaderCircle } from 'lucide-react';
import { useSaveStatus } from '@/stores/saveStatus';
import { m } from '@/i18n';

/** Stato del salvataggio automatico su IndexedDB. */
export function SaveIndicator() {
  const pending = useSaveStatus((s) => s.pending);
  const error = useSaveStatus((s) => s.error);

  if (error) {
    return (
      <span role="status" className="flex items-center gap-1 text-xs text-danger" title={error}>
        <AlertTriangle className="size-3.5" aria-hidden />
        {m.app.save.error}
      </span>
    );
  }
  if (pending > 0) {
    return (
      <span role="status" className="flex items-center gap-1 text-xs text-muted">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        {m.app.save.saving}
      </span>
    );
  }
  return (
    <span
      role="status"
      className="hidden items-center gap-1 text-xs text-muted sm:flex"
      title={m.app.save.auto}
    >
      <Check className="size-3.5 text-ok" aria-hidden />
      {m.app.save.saved}
    </span>
  );
}
