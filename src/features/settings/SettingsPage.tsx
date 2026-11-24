import { useLiveQuery } from 'dexie-react-hooks';
import {
  Compass,
  Download,
  FileUp,
  HardDrive,
  History,
  Library,
  Palette,
  Ruler,
  Scale,
  Trash2,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { getPreReplaceBackup, restorePreReplaceBackup } from '@/db/backup';
import { removeExample } from '@/db/example';
import { getPersistenceStatus, requestPersistence, type PersistenceStatus } from '@/db/persist';
import { settingsRepo } from '@/db/repos/settings';
import { SRD_ATTRIBUTION } from '@/data/srd';
import { db } from '@/db/db';
import { exportFullBackupToFile, exportLibraryPackToFile } from '@/features/backup/actions';
import { ImportContentDialog } from '@/features/library/ImportContentDialog';
import { ImportDialog } from '@/features/backup/ImportDialog';
import { useAppSettings } from '@/hooks/useAppSettings';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';
import { charactersRepo } from '@/db/repos/characters';
import type { Character } from '@/domain/character';
import { Select } from '@/ui/fields';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';

const dateTime = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' });

export function SettingsPage() {
  const settings = useAppSettings();
  const theme = useUiStore((s) => s.theme);
  const active = useActiveCharacter().character;
  const navigate = useNavigate();
  const preReplace = useLiveQuery(() => getPreReplaceBackup(), []);
  const [importOpen, setImportOpen] = useState(false);
  const [confirm, setConfirm] = useState<'restore' | 'example' | null>(null);
  const [persistence, setPersistence] = useState<PersistenceStatus | null>(null);

  useEffect(() => {
    void getPersistenceStatus().then(setPersistence);
  }, []);

  const exportBackup = async () => {
    try {
      const name = await exportFullBackupToFile();
      toast({ tone: 'success', message: `Backup scaricato: ${name}` });
    } catch (e) {
      toast({ tone: 'error', message: `Export non riuscito: ${e instanceof Error ? e.message : e}` });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Section icon={Download} title="Backup e trasferimento">
        <p className="text-muted">
          I dati restano solo in questo browser. Esporta un backup completo ogni tanto, o per spostarli su un
          altro dispositivo.
        </p>
        <p className="text-xs text-muted">
          Ultimo backup completo: {settings.lastBackupAt ? dateTime.format(settings.lastBackupAt) : 'mai'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Download} onClick={() => void exportBackup()}>
            Esporta backup completo
          </Button>
          <Button icon={FileUp} onClick={() => setImportOpen(true)}>
            Importa file…
          </Button>
        </div>
        {preReplace && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg/40 p-3">
            <History className="size-4 text-accent" aria-hidden />
            <span className="flex-1 text-xs">
              Copia dell’archivio salvata prima dell’ultima sostituzione (
              {dateTime.format(preReplace.savedAt)}).
            </span>
            <Button size="sm" onClick={() => setConfirm('restore')}>
              Ripristina
            </Button>
          </div>
        )}
      </Section>

      <ContentSection />

      <Section icon={Ruler} title="Unità di misura">
        <div className="flex gap-2" role="radiogroup" aria-label="Unità di misura">
          {(
            [
              ['metric', 'Metri e kg (manuali italiani)'],
              ['imperial', 'Piedi e libbre'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.units === value}
              onClick={() => void settingsRepo.set('units', value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm',
                settings.units === value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={Palette} title="Aspetto">
        <div className="flex gap-2" role="radiogroup" aria-label="Tema">
          {(
            [
              ['dark', 'Scuro'],
              ['light', 'Chiaro'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => useUiStore.getState().setTheme(value)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm',
                theme === value ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <span className="flex-1 text-muted">
            La visita guidata mostra a cosa serve ogni parte dell’app.
          </span>
          <Button icon={Compass} onClick={() => useUiStore.getState().setTourOpen(true)}>
            Rivedi la visita guidata
          </Button>
        </div>
      </Section>

      {active && <CharacterRules character={active} />}
      <Section icon={HardDrive} title="Archivio del browser">
        <p className="text-muted">
          {persistence === 'persisted'
            ? 'Archivio persistente: il browser non lo cancellerà per liberare spazio.'
            : persistence === 'unsupported'
              ? 'Questo browser non permette di rendere persistente l’archivio: fai backup regolari.'
              : 'Archivio non ancora persistente: in caso di poco spazio il browser potrebbe cancellarlo.'}
        </p>
        {persistence === 'best-effort' && (
          <Button
            onClick={() =>
              void requestPersistence().then((s) => {
                setPersistence(s);
                if (s !== 'persisted')
                  toast({ message: 'Il browser non ha concesso la persistenza: fai backup regolari.' });
              })
            }
          >
            Rendi persistente
          </Button>
        )}
      </Section>

      {settings.example && (
        <Section icon={Trash2} title="Dati di esempio">
          <p className="text-muted">Il personaggio e la campagna dimostrativi sono ancora nell’archivio.</p>
          <Button variant="danger" icon={Trash2} onClick={() => setConfirm('example')}>
            Rimuovi dati di esempio
          </Button>
        </Section>
      )}

      <footer className="border-t border-line pt-4 text-xs text-muted">{SRD_ATTRIBUTION}</footer>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ConfirmDialog
        open={confirm === 'restore'}
        title="Ripristinare l’archivio precedente?"
        confirmLabel="Ripristina"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void restorePreReplaceBackup().then(() => {
            toast({ tone: 'success', message: 'Archivio ripristinato.' });
            navigate('/');
          });
        }}
      >
        L’archivio torna com’era prima dell’ultima sostituzione. Lo stato attuale viene a sua volta salvato,
        così puoi cambiare idea.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'example'}
        title="Rimuovere i dati di esempio?"
        confirmLabel="Rimuovi"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void removeExample().then(() => toast({ tone: 'success', message: 'Dati di esempio rimossi.' }));
        }}
      >
        Vengono eliminati il personaggio Lyra Solmonte, la campagna “La Costa Spezzata” con le sue voci e gli
        incantesimi di esempio non usati da altri personaggi. L’operazione non si può annullare.
      </ConfirmDialog>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Download;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="space-y-3 rounded-xl border border-line bg-panel p-5 text-sm">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-wide">
        <Icon className="size-4 text-accent" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Libreria di contenuti: import in blocco (5etools / pacchetti Codex) ed export di un pacchetto da condividere. */
function ContentSection() {
  const [open, setOpen] = useState(false);
  const counts = useLiveQuery(async () => {
    const items = await db.libraryItems.toArray();
    const by = (k: string) => items.filter((i) => i.kind === k).length;
    return {
      spells: await db.spells.count(),
      species: by('species'),
      background: by('background'),
      feat: by('feat'),
      item: by('item'),
    };
  }, []);

  const exportPack = async () => {
    try {
      const name = await exportLibraryPackToFile();
      toast({ tone: 'success', message: `Pacchetto scaricato: ${name}` });
    } catch (e) {
      toast({ tone: 'error', message: `Export non riuscito: ${e instanceof Error ? e.message : e}` });
    }
  };

  const summary = counts
    ? [
        `${counts.spells} incantesimi`,
        `${counts.species} specie`,
        `${counts.background} background`,
        `${counts.feat} talenti`,
        `${counts.item} oggetti`,
      ].join(' · ')
    : '…';

  return (
    <Section icon={Library} title="Contenuti">
      <p className="text-muted">
        Importa in una volta sola più file di 5etools (incantesimi, specie, background, talenti, oggetti) o un
        pacchetto di Codex. Per dare a qualcuno tutti i tuoi contenuti pronti, esporta il pacchetto: chi lo
        importa li ritrova nel wizard, nella scheda, nel grimorio e nell’inventario. Specie, background e
        talenti SRD sono già inclusi nell’app.
      </p>
      <p className="text-xs text-muted">In libreria: {summary} (oltre ai contenuti SRD integrati).</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={FileUp} onClick={() => setOpen(true)}>
          Importa contenuti…
        </Button>
        <Button icon={Download} onClick={() => void exportPack()}>
          Esporta pacchetto contenuti
        </Button>
      </div>
      <p className="text-xs text-muted">
        Condividi solo materiale SRD, tuo, o di manuali che anche gli altri possiedono.
      </p>
      {open && <ImportContentDialog onClose={() => setOpen(false)} />}
    </Section>
  );
}

/** Regole opzionali e automatismi del personaggio attivo. */
function CharacterRules({ character }: { character: Character }) {
  const update = (recipe: (s: Character['settings']) => void) =>
    void charactersRepo.mutate(character.id, (d) => recipe(d.settings));
  const s = character.settings;
  return (
    <Section icon={Scale} title={`Regole di ${character.identity.name || 'questo personaggio'}`}>
      <label className="flex items-center justify-between gap-3">
        <span>Ingombro</span>
        <Select
          label="Regola di ingombro"
          value={s.encumbranceRule}
          className="w-auto"
          onValue={(v) => update((x) => void (x.encumbranceRule = v))}
          options={[
            { value: 'off', label: 'Non considerare' },
            { value: 'standard', label: 'Capacità di carico (FOR × 15)' },
            { value: 'variant', label: 'Variante: Ingombrato / Pesantemente ingombrato' },
          ]}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={s.heroicInspirationOnLongRest}
          onChange={(e) => {
            const v = e.target.checked;
            update((x) => void (x.heroicInspirationOnLongRest = v));
          }}
        />
        Ispirazione Eroica a ogni Riposo Lungo (Umano: Intraprendente)
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={s.clearTempHpOnLongRest}
          onChange={(e) => {
            const v = e.target.checked;
            update((x) => void (x.clearTempHpOnLongRest = v));
          }}
        />
        Azzera i PF temporanei con il Riposo Lungo
      </label>
    </Section>
  );
}
