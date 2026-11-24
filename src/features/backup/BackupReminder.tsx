import { useLiveQuery } from 'dexie-react-hooks';
import { DatabaseBackup } from 'lucide-react';
import { db } from '@/db/db';
import { useAppSettings } from '@/hooks/useAppSettings';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { DAY, exportFullBackupToFile, shouldRemindBackup } from './actions';

/** Fascia discreta sotto la barra in alto: i dati vivono solo nel browser, un backup ogni tanto li protegge. */
export function BackupReminder() {
  const { lastBackupAt } = useAppSettings();
  const snoozeUntil = useUiStore((s) => s.backupSnoozeUntil);
  const hasData = useLiveQuery(async () => (await db.characters.count()) > 0, [], false);
  if (!shouldRemindBackup({ hasData, lastBackupAt, snoozeUntil })) return null;

  const days = lastBackupAt ? Math.floor((Date.now() - lastBackupAt) / DAY) : null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft/40 px-5 py-1.5 text-xs"
    >
      <DatabaseBackup className="size-4 text-accent" aria-hidden />
      <span className="flex-1">
        {days === null ? 'Non hai ancora fatto un backup.' : `Ultimo backup ${days} giorni fa.`} I dati sono
        salvati solo in questo browser.
      </span>
      <Button
        size="sm"
        variant="primary"
        onClick={() =>
          void exportFullBackupToFile().then((name) =>
            toast({ tone: 'success', message: `Backup scaricato: ${name}` }),
          )
        }
      >
        Esporta ora
      </Button>
      <Button size="sm" variant="ghost" onClick={() => useUiStore.getState().snoozeBackupReminder(7)}>
        Più tardi
      </Button>
    </div>
  );
}
