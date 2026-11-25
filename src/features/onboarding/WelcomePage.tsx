import { FileJson, FlaskConical, UserPlus, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { charactersRepo } from '@/db/repos/characters';
import { loadExample } from '@/db/example';
import { requestPersistence } from '@/db/persist';
import { ImportDialog } from '@/features/backup/ImportDialog';
import { useAppSettings } from '@/hooks/useAppSettings';
import { trackSave } from '@/stores/saveStatus';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { LOCALE, LOCALES, m, setLocale } from '@/i18n';

const T = m.onboarding.welcome;

interface StartOption {
  icon: LucideIcon;
  title: string;
  description: string;
  onSelect: () => void;
}

export function WelcomePage() {
  const navigate = useNavigate();
  const setActiveCharacter = useUiStore((s) => s.setActiveCharacter);
  const setSheetEditMode = useUiStore((s) => s.setSheetEditMode);
  const { example } = useAppSettings();
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  /** Esegue un'azione di avvio che produce un personaggio e lo apre. */
  const start = async (create: () => Promise<string>) => {
    setBusy(true);
    try {
      const id = await trackSave(create);
      // Il gesto dell'utente è il momento giusto per chiedere l'archivio persistente.
      void requestPersistence();
      setActiveCharacter(id);
      navigate(`/pg/${id}/scheda`);
    } catch (e) {
      toast({ tone: 'error', message: T.failed(e instanceof Error ? e.message : String(e)) });
    } finally {
      setBusy(false);
    }
  };

  const options: StartOption[] = [
    {
      icon: UserPlus,
      title: T.createTitle,
      description: T.createDesc,
      onSelect: () => navigate('/nuovo'),
    },
    {
      icon: FileJson,
      title: T.importTitle,
      description: T.importDesc,
      onSelect: () => setImportOpen(true),
    },
    {
      icon: FlaskConical,
      title: example ? T.openExample : T.loadExample,
      description: example ? T.exampleLoaded : T.exampleDesc,
      onSelect: () => void start(loadExample),
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 p-8">
      <div className="space-y-2 text-center">
        <h2 className="font-display text-3xl tracking-wide">{T.title}</h2>
        <p className="text-muted">{T.intro}</p>
      </div>

      <div data-tour="start" className="grid gap-3 sm:grid-cols-3">
        {options.map(({ icon: Icon, title, description, onSelect }) => (
          <button
            key={title}
            type="button"
            disabled={busy}
            onClick={onSelect}
            className="flex flex-col items-start gap-3 rounded-xl border border-line bg-panel p-4 text-left transition-colors enabled:hover:border-accent/60 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="font-medium">{title}</span>
            <span className="text-sm text-muted">{description}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-muted">
        {T.preferManual}{' '}
        <button
          type="button"
          disabled={busy}
          className="text-accent hover:underline"
          onClick={() => {
            // Una scheda vuota si apre già in modalità Modifica.
            setSheetEditMode(true);
            void start(async () => (await charactersRepo.create()).id);
          }}
        >
          {T.blank}
        </button>
      </p>

      <div role="radiogroup" aria-label={T.language} className="flex justify-center gap-1 text-xs">
        {LOCALES.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={LOCALE === l.id}
            onClick={() => LOCALE !== l.id && setLocale(l.id)}
            className={
              LOCALE === l.id
                ? 'rounded-full border border-accent px-2.5 py-0.5 text-accent'
                : 'rounded-full border border-line px-2.5 py-0.5 text-muted hover:text-ink'
            }
          >
            {l.label}
          </button>
        ))}
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
