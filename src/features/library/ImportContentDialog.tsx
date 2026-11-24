import { FileUp, LoaderCircle } from 'lucide-react';
import { useId, useMemo, useState, type DragEvent } from 'react';
import type { LibraryCountKey } from '@/db/backup';
import { cn } from '@/lib/cn';
import { readFileText } from '@/lib/download';
import { toast } from '@/stores/toastStore';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { applyContentImport, planContentImport, type ContentPlan } from './importContent';

const KIND_LABELS: Array<[LibraryCountKey, string]> = [
  ['spells', 'Incantesimi'],
  ['species', 'Specie'],
  ['background', 'Background'],
  ['feat', 'Talenti'],
  ['item', 'Oggetti'],
  ['feature', 'Privilegi'],
];

/**
 * Import in blocco di contenuti da uno o più file: JSON di 5etools (incantesimi, specie,
 * background, talenti, oggetti) e pacchetti contenuti di Codex. Anteprima per tipo e per manuale.
 */
export function ImportContentDialog({ onClose }: { onClose: () => void }) {
  const inputId = useId();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [kindsOff, setKindsOff] = useState<Set<LibraryCountKey>>(new Set());
  const [sourcesOff, setSourcesOff] = useState<Set<string>>(new Set());

  const read = async (list: FileList | File[]) => {
    const files = [...list];
    if (!files.length) return;
    setBusy(true);
    try {
      const texts = await Promise.all(
        files.map(async (f) => ({ name: f.name, text: await readFileText(f) })),
      );
      setFileNames(files.map((f) => f.name));
      setPlan(await planContentImport(texts));
      setKindsOff(new Set());
      setSourcesOff(new Set());
    } finally {
      setBusy(false);
    }
  };

  const sources = useMemo(() => {
    const m = new Map<string, { total: number; fresh: number }>();
    for (const c of plan?.candidates ?? []) {
      const s = c.source ?? 'Senza fonte';
      const e = m.get(s) ?? { total: 0, fresh: 0 };
      e.total++;
      if (!c.duplicate) e.fresh++;
      m.set(s, e);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [plan]);

  const selected = (plan?.candidates ?? []).filter(
    (c) => !c.duplicate && !kindsOff.has(c.kind) && !sourcesOff.has(c.source ?? 'Senza fonte'),
  );

  const toggle = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await applyContentImport(selected, plan?.classUpdates);
      toast({
        tone: 'success',
        message: `Importati ${res.spells} incantesimi e ${res.items} voci di libreria${plan?.classUpdates.length ? `; classi aggiunte a ${plan.classUpdates.length} incantesimi` : ''}.`,
      });
      onClose();
    } catch (e) {
      toast({ tone: 'error', message: `Import non riuscito: ${e instanceof Error ? e.message : e}` });
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void read(e.dataTransfer.files);
  };

  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      title="Importa contenuti"
      size="lg"
      footer={
        plan && (
          <>
            <Button variant="ghost" onClick={() => setPlan(null)} disabled={busy}>
              Scegli altri file
            </Button>
            <Button
              variant="primary"
              disabled={(!selected.length && !plan.classUpdates.length) || busy}
              onClick={() => void confirm()}
            >
              {busy ? 'Importazione…' : `Importa ${selected.length}`}
            </Button>
          </>
        )
      }
    >
      {!plan ? (
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
            {busy ? (
              <LoaderCircle className="size-8 animate-spin text-accent" aria-hidden />
            ) : (
              <FileUp className="size-8 text-accent" aria-hidden />
            )}
            <span className="font-medium">
              Trascina qui uno o più file .json, oppure clicca per sceglierli
            </span>
            <span className="text-xs text-muted">
              File di 5etools (spells, races, backgrounds, feats, items) e pacchetti contenuti di Codex. I
              file restano sul tuo dispositivo.
            </span>
          </label>
          <input
            id={inputId}
            type="file"
            multiple
            accept="application/json,.json"
            aria-label="File di contenuti"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) void read(e.target.files);
              e.target.value = '';
            }}
          />
          <p className="text-xs text-muted">
            Importa solo contenuti dei manuali che possiedi. Se condividi un pacchetto, includi solo materiale
            SRD o tuo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            {fileNames.length === 1 ? fileNames[0] : `${fileNames.length} file`} · {plan.candidates.length}{' '}
            voci riconosciute
            {plan.skipped > 0 && `, ${plan.skipped} ignorate (copie o incomplete)`}. Le voci già presenti
            vengono saltate.
          </p>
          {plan.classUpdates.length > 0 && (
            <p className="text-xs text-ok">
              {plan.classUpdates.length} incantesimi già nella libreria riceveranno l’elenco delle classi.
            </p>
          )}
          {plan.warnings.length > 0 && (
            <ul
              role="alert"
              className="space-y-1 rounded-md border border-danger/40 bg-danger/10 p-3 text-xs text-danger"
            >
              {plan.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1 font-medium">Tipo</th>
                <th className="py-1 text-right font-medium">Nei file</th>
                <th className="py-1 text-right font-medium">Nuovi</th>
              </tr>
            </thead>
            <tbody>
              {KIND_LABELS.map(([kind, label]) => {
                const all = plan.candidates.filter((c) => c.kind === kind);
                if (!all.length) return null;
                return (
                  <tr key={kind} className="border-t border-line">
                    <td className="py-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!kindsOff.has(kind)}
                          onChange={() => setKindsOff(toggle(kindsOff, kind))}
                        />
                        {label}
                      </label>
                    </td>
                    <td className="py-1 text-right tabular-nums">{all.length}</td>
                    <td className="py-1 text-right tabular-nums">{all.filter((c) => !c.duplicate).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sources.length > 1 && (
            <fieldset className="space-y-1">
              <legend className="mb-1 text-xs font-semibold text-muted">Manuali</legend>
              <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-3">
                {sources.map(([s, n]) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!sourcesOff.has(s)}
                      onChange={() => setSourcesOff(toggle(sourcesOff, s))}
                    />
                    <span className="truncate">{s}</span>
                    <span className="text-xs text-muted tabular-nums">
                      {n.fresh}/{n.total}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className="text-xs text-muted">
            Nomi e testi restano in inglese come nel file; puoi modificarli dopo. Specie, background e talenti
            compaiono nel wizard e nella scheda; gli oggetti nell’inventario («Dalla libreria»).
          </p>
        </div>
      )}
    </Dialog>
  );
}
