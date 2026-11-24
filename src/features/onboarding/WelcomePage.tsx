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
      toast({ tone: 'error', message: `Operazione non riuscita: ${e instanceof Error ? e.message : e}` });
    } finally {
      setBusy(false);
    }
  };

  const options: StartOption[] = [
    {
      icon: UserPlus,
      title: 'Crea nuovo personaggio',
      description: 'Creazione guidata in pochi passi: classe, caratteristiche, competenze, equipaggiamento.',
      onSelect: () => navigate('/nuovo'),
    },
    {
      icon: FileJson,
      title: 'Importa da JSON',
      description: 'Carica un personaggio esportato o un backup completo dell’archivio.',
      onSelect: () => setImportOpen(true),
    },
    {
      icon: FlaskConical,
      title: example ? 'Apri l’esempio' : 'Carica esempio',
      description: example
        ? 'Il personaggio dimostrativo è già caricato: aprilo. Si rimuove dalle Impostazioni.'
        : 'Una Paladina di 3° livello e una mini-campagna per provare subito l’interfaccia.',
      onSelect: () => void start(loadExample),
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-8 p-8">
      <div className="space-y-2 text-center">
        <h2 className="font-display text-3xl tracking-wide">Benvenuto, avventuriero</h2>
        <p className="text-muted">
          Scheda, grimorio, inventario e appunti di campagna in un’unica app. Tutto resta salvato su questo
          dispositivo, anche offline.
        </p>
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
        Preferisci compilare tutto a mano?{' '}
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
          Inizia da una scheda vuota
        </button>
      </p>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
