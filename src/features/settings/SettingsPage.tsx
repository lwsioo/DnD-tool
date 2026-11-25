import { useLiveQuery } from 'dexie-react-hooks';
import {
  Compass,
  Download,
  FileUp,
  HardDrive,
  History,
  Languages,
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
import { LANG_TAG, LOCALE, LOCALES, m, setLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';
import { charactersRepo } from '@/db/repos/characters';
import type { Character } from '@/domain/character';
import { Select } from '@/ui/fields';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';

const T = m.settings;
const dateTime = new Intl.DateTimeFormat(LANG_TAG, { dateStyle: 'medium', timeStyle: 'short' });
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Gruppo di pulsanti a scelta singola (unità, tema, lingua). */
function Choice<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: ReadonlyArray<readonly [V, string]>;
  onChange: (v: V) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'rounded-md border px-3 py-1.5 text-sm',
            value === v ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

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
      toast({ tone: 'success', message: T.backupDownloaded(name) });
    } catch (e) {
      toast({ tone: 'error', message: m.common.exportFailed(errorText(e)) });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Section icon={Download} title={T.backup.title}>
        <p className="text-muted">{T.backup.intro}</p>
        <p className="text-xs text-muted">
          {T.backup.last(settings.lastBackupAt ? dateTime.format(settings.lastBackupAt) : T.backup.never)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Download} onClick={() => void exportBackup()}>
            {T.backup.export}
          </Button>
          <Button icon={FileUp} onClick={() => setImportOpen(true)}>
            {T.backup.import}
          </Button>
        </div>
        {preReplace && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg/40 p-3">
            <History className="size-4 text-accent" aria-hidden />
            <span className="flex-1 text-xs">{T.backup.preReplace(dateTime.format(preReplace.savedAt))}</span>
            <Button size="sm" onClick={() => setConfirm('restore')}>
              {T.backup.restore}
            </Button>
          </div>
        )}
      </Section>

      <ContentSection />

      <Section icon={Languages} title={T.language.title}>
        <p className="text-muted">{T.language.intro}</p>
        <Choice
          label={T.language.title}
          value={LOCALE}
          options={LOCALES.map((l) => [l.id, l.label] as const)}
          onChange={setLocale}
        />
        <p className="text-xs text-muted">{T.language.note}</p>
      </Section>

      <Section icon={Ruler} title={T.units.title}>
        <Choice
          label={T.units.title}
          value={settings.units}
          options={[
            ['metric', T.units.metric],
            ['imperial', T.units.imperial],
          ]}
          onChange={(v) => void settingsRepo.set('units', v)}
        />
      </Section>

      <Section icon={Palette} title={T.appearance.title}>
        <Choice
          label={T.appearance.theme}
          value={theme}
          options={[
            ['dark', T.appearance.dark],
            ['light', T.appearance.light],
          ]}
          onChange={(v) => useUiStore.getState().setTheme(v)}
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <span className="flex-1 text-muted">{T.appearance.tourHint}</span>
          <Button icon={Compass} onClick={() => useUiStore.getState().setTourOpen(true)}>
            {T.appearance.tour}
          </Button>
        </div>
      </Section>

      {active && <CharacterRules character={active} />}
      <Section icon={HardDrive} title={T.storage.title}>
        <p className="text-muted">
          {persistence === 'persisted'
            ? T.storage.persisted
            : persistence === 'unsupported'
              ? T.storage.unsupported
              : T.storage.bestEffort}
        </p>
        {persistence === 'best-effort' && (
          <Button
            onClick={() =>
              void requestPersistence().then((s) => {
                setPersistence(s);
                if (s !== 'persisted') toast({ message: T.storage.denied });
              })
            }
          >
            {T.storage.persist}
          </Button>
        )}
      </Section>

      {settings.example && (
        <Section icon={Trash2} title={T.example.title}>
          <p className="text-muted">{T.example.intro}</p>
          <Button variant="danger" icon={Trash2} onClick={() => setConfirm('example')}>
            {T.example.remove}
          </Button>
        </Section>
      )}

      <footer className="border-t border-line pt-4 text-xs text-muted">{SRD_ATTRIBUTION}</footer>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ConfirmDialog
        open={confirm === 'restore'}
        title={T.backup.restoreTitle}
        confirmLabel={T.backup.restore}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void restorePreReplaceBackup().then(() => {
            toast({ tone: 'success', message: T.backup.restored });
            navigate('/');
          });
        }}
      >
        {T.backup.restoreBody}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'example'}
        title={T.example.confirmTitle}
        confirmLabel={T.example.confirm}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void removeExample().then(() => toast({ tone: 'success', message: T.example.removed }));
        }}
      >
        {T.example.body}
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
      toast({ tone: 'success', message: T.packDownloaded(name) });
    } catch (e) {
      toast({ tone: 'error', message: m.common.exportFailed(errorText(e)) });
    }
  };

  return (
    <Section icon={Library} title={T.content.title}>
      <p className="text-muted">{T.content.intro}</p>
      <p className="text-xs text-muted">{T.content.inLibrary(counts ? T.content.counts(counts) : '…')}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={FileUp} onClick={() => setOpen(true)}>
          {T.content.import}
        </Button>
        <Button icon={Download} onClick={() => void exportPack()}>
          {T.content.export}
        </Button>
      </div>
      <p className="text-xs text-muted">{T.content.shareNote}</p>
      {open && <ImportContentDialog onClose={() => setOpen(false)} />}
    </Section>
  );
}

/** Regole opzionali e automatismi del personaggio attivo. */
function CharacterRules({ character }: { character: Character }) {
  const update = (recipe: (s: Character['settings']) => void) =>
    void charactersRepo.mutate(character.id, (d) => recipe(d.settings));
  const s = character.settings;
  const R = T.rules;
  return (
    <Section icon={Scale} title={R.title(character.identity.name)}>
      <label className="flex items-center justify-between gap-3">
        <span>{R.encumbrance}</span>
        <Select
          label={R.encumbranceRule}
          value={s.encumbranceRule}
          className="w-auto"
          onValue={(v) => update((x) => void (x.encumbranceRule = v))}
          options={[
            { value: 'off', label: R.off },
            { value: 'standard', label: R.standard },
            { value: 'variant', label: R.variant },
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
        {R.inspiration}
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
        {R.clearTemp}
      </label>
    </Section>
  );
}
