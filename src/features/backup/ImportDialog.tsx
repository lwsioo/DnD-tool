import { FileUp, LoaderCircle } from 'lucide-react';
import { useId, useState, type DragEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  applyCharacterImport,
  applyFullBackup,
  applyLibraryPack,
  ImportError,
  planImport,
  type ArchiveCounts,
  type ImportPlan,
  type LibraryCountKey,
} from '@/db/backup';
import { classSummary } from '@/features/character/useCurrentCharacter';
import { readFileText } from '@/lib/download';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { m } from '@/i18n';

const B = m.misc.backup;

type State =
  | { step: 'pick'; error?: string }
  | { step: 'reading' }
  | { step: 'preview'; plan: ImportPlan; fileName: string }
  | { step: 'importing'; plan: ImportPlan; fileName: string };

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Import da file JSON (personaggio singolo o backup completo):
 * scelta del file → validazione → anteprima con gestione dei conflitti → import.
 */
export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const [state, setState] = useState<State>({ step: 'pick' });
  const [characterMode, setCharacterMode] = useState<'copy' | 'replace'>('copy');
  const [backupMode, setBackupMode] = useState<'merge' | 'replace'>('merge');
  const navigate = useNavigate();
  const setActiveCharacter = useUiStore((s) => s.setActiveCharacter);

  const close = () => {
    setState({ step: 'pick' });
    setCharacterMode('copy');
    setBackupMode('merge');
    onClose();
  };

  const readFile = async (file: File) => {
    setState({ step: 'reading' });
    try {
      // Il parser (con zod) si carica solo al primo import.
      const { parseImportText } = await import('@/db/importParse');
      const parsed = parseImportText(await readFileText(file));
      setState({ step: 'preview', plan: await planImport(parsed), fileName: file.name });
    } catch (e) {
      const message = e instanceof ImportError ? e.message : B.unreadable;
      setState({ step: 'pick', error: message });
    }
  };

  const confirm = async () => {
    if (state.step !== 'preview') return;
    const { plan } = state;
    setState({ ...state, step: 'importing' });
    try {
      if (plan.kind === 'character') {
        const { characterId } = await applyCharacterImport(plan.file, characterMode);
        setActiveCharacter(characterId);
        toast({
          tone: 'success',
          message: B.characterImported(plan.file.data.character.identity.name),
        });
        close();
        navigate(`/pg/${characterId}/scheda`);
      } else if (plan.kind === 'library') {
        const res = await applyLibraryPack(plan.file.data);
        toast({
          tone: 'success',
          message: B.contentImported(res.spells, res.items),
        });
        close();
      } else {
        await applyFullBackup(plan.file.data, backupMode);
        toast({
          tone: 'success',
          message: backupMode === 'replace' ? B.replaced : B.merged,
        });
        close();
        navigate('/');
      }
    } catch (e) {
      setState({ step: 'pick', error: m.common.importFailed(e instanceof Error ? e.message : String(e)) });
    }
  };

  const busy = state.step === 'reading' || state.step === 'importing';

  return (
    <Dialog
      open={open}
      onClose={busy ? () => {} : close}
      title={B.title}
      size="md"
      footer={
        state.step === 'preview' || state.step === 'importing' ? (
          <>
            <Button variant="ghost" onClick={() => setState({ step: 'pick' })} disabled={busy}>
              {B.otherFile}
            </Button>
            <Button variant="primary" onClick={() => void confirm()} disabled={busy} data-autofocus>
              {state.step === 'importing' ? B.importing : B.import}
            </Button>
          </>
        ) : undefined
      }
    >
      {state.step === 'pick' && <FilePicker error={state.error} onFile={(f) => void readFile(f)} />}
      {state.step === 'reading' && (
        <p className="flex items-center gap-2 text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden /> {B.reading}
        </p>
      )}
      {(state.step === 'preview' || state.step === 'importing') && (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            {B.fileInfo}
            <span className="text-ink">{state.fileName}</span>
            {B.createdWith(state.plan.file.appVersion)}
          </p>
          {state.plan.kind === 'character' ? (
            <CharacterPreview plan={state.plan} mode={characterMode} onMode={setCharacterMode} />
          ) : state.plan.kind === 'library' ? (
            <LibraryPreview plan={state.plan} />
          ) : (
            <BackupPreview plan={state.plan} mode={backupMode} onMode={setBackupMode} />
          )}
        </div>
      )}
    </Dialog>
  );
}

function FilePicker({ error, onFile }: { error?: string; onFile: (f: File) => void }) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          dragging ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/50',
        )}
      >
        <FileUp className="size-8 text-accent" aria-hidden />
        <span className="font-medium">{B.drop}</span>
        <span className="text-xs text-muted">{B.dropHint}</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="application/json,.json"
        aria-label={B.fileLabel}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 p-3 whitespace-pre-line text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Option({
  checked,
  onChange,
  title,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  children?: ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer gap-3 rounded-lg border p-3',
        checked ? 'border-accent bg-accent-soft/50' : 'border-line',
      )}
    >
      <input type="radio" checked={checked} onChange={onChange} className="mt-1 accent-[var(--c-accent)]" />
      <span>
        <span className="block font-medium">{title}</span>
        {children && <span className="block text-xs text-muted">{children}</span>}
      </span>
    </label>
  );
}

function CharacterPreview({
  plan,
  mode,
  onMode,
}: {
  plan: Extract<ImportPlan, { kind: 'character' }>;
  mode: 'copy' | 'replace';
  onMode: (m: 'copy' | 'replace') => void;
}) {
  const c = plan.file.data.character;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-bg/40 p-3">
        <p className="font-display text-lg">{c.identity.name || m.common.unnamed}</p>
        <p className="text-muted">{[c.identity.species, classSummary(c)].filter(Boolean).join(' · ')}</p>
        <p className="mt-2 text-xs text-muted">
          {plan.spells.total === 0
            ? B.noSpells
            : B.spells(plan.spells.total, plan.spells.toAdd, plan.spells.alreadyPresent)}
        </p>
        {plan.campaignMissing && (
          <p className="mt-1 text-xs text-muted">
            {B.campaignMissing}
          </p>
        )}
      </div>
      {plan.existingName && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold text-muted">
            {B.exists(plan.existingName)}
          </legend>
          <Option checked={mode === 'copy'} onChange={() => onMode('copy')} title={B.asCopy}>
            {B.asCopyHint}
          </Option>
          <Option
            checked={mode === 'replace'}
            onChange={() => onMode('replace')}
            title={B.replace}
          >
            {B.replaceHint}
          </Option>
        </fieldset>
      )}
    </div>
  );
}

const COUNT_LABELS: Array<[keyof ArchiveCounts, string]> = [
  ['characters', B.counts.characters],
  ['campaigns', B.counts.campaigns],
  ['wikiEntries', B.counts.wikiEntries],
  ['spells', B.counts.spells],
  ['libraryItems', B.counts.libraryItems],
];

function BackupPreview({
  plan,
  mode,
  onMode,
}: {
  plan: Extract<ImportPlan, { kind: 'fullBackup' }>;
  mode: 'merge' | 'replace';
  onMode: (m: 'merge' | 'replace') => void;
}) {
  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1 font-medium">{B.fullBackup}</th>
            <th className="py-1 text-right font-medium">{B.inFile}</th>
            <th className="py-1 text-right font-medium">{B.inApp}</th>
          </tr>
        </thead>
        <tbody>
          {COUNT_LABELS.map(([key, label]) => (
            <tr key={key} className="border-t border-line">
              <td className="py-1">{label}</td>
              <td className="py-1 text-right tabular-nums">{plan.incoming[key]}</td>
              <td className="py-1 text-right text-muted tabular-nums">{plan.current[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <fieldset className="space-y-2">
        <Option checked={mode === 'merge'} onChange={() => onMode('merge')} title={B.merge}>
          {B.mergeHint}
        </Option>
        <Option checked={mode === 'replace'} onChange={() => onMode('replace')} title={B.replaceAll}>
          {B.replaceAllHint}
        </Option>
      </fieldset>
    </div>
  );
}

const LK = m.misc.library.kinds;
const LIBRARY_LABELS: Array<[LibraryCountKey, string]> = [
  ['spells', LK.spells],
  ['species', LK.species],
  ['background', LK.background],
  ['feat', LK.feat],
  ['item', LK.item],
  ['feature', LK.feature],
];

function LibraryPreview({ plan }: { plan: Extract<ImportPlan, { kind: 'library' }> }) {
  const rows = LIBRARY_LABELS.filter(([key]) => plan.counts[key].total > 0);
  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1 font-medium">{B.pack}</th>
            <th className="py-1 text-right font-medium">{B.inFile}</th>
            <th className="py-1 text-right font-medium">{B.newOnes}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, label]) => (
            <tr key={key} className="border-t border-line">
              <td className="py-1">{label}</td>
              <td className="py-1 text-right tabular-nums">{plan.counts[key].total}</td>
              <td className="py-1 text-right tabular-nums">{plan.counts[key].toAdd}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-muted">{B.emptyPack}</p>}
      <p className="text-xs text-muted">
        {B.packNote}
      </p>
    </div>
  );
}
