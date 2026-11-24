import { cn } from '@/lib/cn';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Link2, Pencil, Trash2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { db } from '@/db/db';
import { backlinksFor, countTextReferences, propagateRename } from '@/db/linkIndexer';
import { wikiRepo } from '@/db/repos/wiki';
import type { ID } from '@/domain/primitives';
import type { WikiEntry } from '@/domain/wiki';
import { trackSave } from '@/stores/saveStatus';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { FieldLabel, inputClass } from '@/ui/fields';
import { MarkdownView } from '@/ui/MarkdownView';
import { TagInput } from '@/ui/TagInput';
import { CATEGORY_INFO } from './categories';
// CodeMirror è pesante: si scarica solo quando si apre l'editor.
const MarkdownEditor = lazy(() => import('./MarkdownEditor').then((m) => ({ default: m.MarkdownEditor })));
import { MetaEditor } from './MetaEditor';
import { MetaSummary } from './MetaSummary';
import { linkOptions } from './wikilink/completion';
import { useWikiLinks } from './wikilink/WikiLinkContext';

/** Una voce della wiki: lettura con backlink, oppure modifica con salvataggio automatico. */
export function EntryPage({ entryId }: { entryId: ID }) {
  const entry = useLiveQuery(async () => (await db.wikiEntries.get(entryId)) ?? null, [entryId]);
  const [params, setParams] = useSearchParams();
  const editing = params.get('modifica') === '1';
  const setEditing = (on: boolean) => setParams(on ? { modifica: '1' } : {}, { replace: true });

  if (entry === undefined) return null;
  if (entry === null)
    return <p className="p-6 text-sm text-muted">Voce non trovata: forse è stata eliminata.</p>;
  return editing ? (
    <EntryEditor key={entry.id} entry={entry} onDone={() => setEditing(false)} />
  ) : (
    <EntryView entry={entry} onEdit={() => setEditing(true)} />
  );
}

function EntryView({ entry, onEdit }: { entry: WikiEntry; onEdit: () => void }) {
  const navigate = useNavigate();
  const openInspector = useUiStore((s) => s.openInspector);
  const backlinks = useLiveQuery(() => backlinksFor(entry), [entry], []);
  const info = CATEGORY_INFO[entry.category];

  const remove = async () => {
    await wikiRepo.remove(entry.id);
    navigate(`/campagna/${entry.campaignId}/${info.slug}`);
    toast({
      message: `“${entry.title}” eliminata.`,
      duration: 10_000,
      action: {
        label: 'Annulla',
        onClick: async () => {
          await wikiRepo.save(entry);
          navigate(`/campagna/${entry.campaignId}/${info.slug}/${entry.id}`);
        },
      },
    });
  };

  return (
    <article className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            {info.icon} {info.singular}
          </p>
          <h2 className="font-display text-2xl tracking-wide">{entry.title}</h2>
          {entry.aliases.length > 0 && (
            <p className="text-sm text-muted italic">anche: {entry.aliases.join(', ')}</p>
          )}
        </div>
        <Button size="sm" icon={Pencil} onClick={onEdit}>
          Modifica
        </Button>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => void remove()}>
          Elimina
        </Button>
      </header>

      <MetaSummary entry={entry} />

      {entry.body ? (
        <MarkdownView>{entry.body}</MarkdownView>
      ) : (
        <p className="text-sm text-muted">
          Nessun testo.{' '}
          <button type="button" className="text-accent hover:underline" onClick={onEdit}>
            Scrivi qualcosa
          </button>
          ; usa <code>[[Nome]]</code> per collegare altre voci.
        </p>
      )}

      <section aria-label="Menzionato in" className="space-y-2 border-t border-line pt-4">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
          <Link2 className="size-3.5" aria-hidden /> Menzionato in ({backlinks.length})
        </h3>
        {backlinks.length === 0 ? (
          <p className="text-sm text-muted">Nessuna nota collega ancora questa voce.</p>
        ) : (
          <ul className="space-y-2">
            {backlinks.map((b) => (
              <li key={b.sourceId} className="rounded-lg border border-line bg-panel p-3 text-sm">
                <button
                  type="button"
                  className="font-medium hover:text-accent hover:underline"
                  onClick={() =>
                    b.sourceKind === 'wiki'
                      ? openInspector({ kind: 'wiki', id: b.sourceId })
                      : navigate(`/pg/${b.sourceId}/scheda`)
                  }
                >
                  {b.category ? CATEGORY_INFO[b.category].icon : '🧙'} {b.title}
                </button>
                {b.viaMeta && <span className="ml-2 text-xs text-muted">(nei dati della voce)</span>}
                {b.snippets.map((s) => (
                  <p key={s} className="mt-1 text-xs text-muted">
                    {s}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

const SAVE_DELAY = 500;

function EntryEditor({ entry, onDone }: { entry: WikiEntry; onDone: () => void }) {
  const [draft, setDraft] = useState(entry);
  const originalTitle = useRef(entry.title);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; value: WikiEntry } | null>(null);
  const [rename, setRename] = useState<{ links: number; sources: number } | null>(null);
  const ctx = useWikiLinks();
  const options = ctx ? linkOptions(ctx.index) : [];

  const flush = () => {
    const p = pending.current;
    if (!p) return Promise.resolve();
    clearTimeout(p.timer);
    pending.current = null;
    return trackSave(() => wikiRepo.save(p.value)).then(() => undefined);
  };

  const update = (next: WikiEntry) => {
    setDraft(next);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { value: next, timer: setTimeout(() => void flush(), SAVE_DELAY) };
  };

  // Salva ciò che resta in sospeso uscendo dall'editor.
  useEffect(() => () => void flush(), []);

  const finish = async () => {
    if (!draft.title.trim()) return toast({ tone: 'error', message: 'Il titolo non può essere vuoto.' });
    await flush();
    const old = originalTitle.current;
    if (old !== draft.title) {
      const refs = await countTextReferences(entry.campaignId, old, entry.id);
      if (refs.links > 0) return setRename(refs);
    }
    onDone();
  };

  const applyRename = async (propagate: boolean) => {
    setRename(null);
    if (propagate) {
      const n = await propagateRename(entry.campaignId, originalTitle.current, draft.title);
      toast({ tone: 'success', message: `${n} collegamenti aggiornati.` });
    }
    onDone();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-xs font-semibold tracking-wider text-muted uppercase">
          {CATEGORY_INFO[entry.category].icon} Modifica {CATEGORY_INFO[entry.category].singular.toLowerCase()}{' '}
          · salvataggio automatico
        </p>
        <Button size="sm" variant="primary" icon={Check} onClick={() => void finish()}>
          Fine
        </Button>
      </div>

      <FieldLabel label="Titolo">
        <input
          aria-label="Titolo"
          className={cn(inputClass, 'font-display text-xl tracking-wide')}
          value={draft.title}
          onChange={(e) => update({ ...draft, title: e.target.value })}
        />
      </FieldLabel>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel label="Altri nomi (alias)">
          <TagInput
            label="Alias"
            values={draft.aliases}
            onChange={(aliases) => update({ ...draft, aliases })}
          />
        </FieldLabel>
        <FieldLabel label="Tag">
          <TagInput label="Tag" values={draft.tags} onChange={(tags) => update({ ...draft, tags })} />
        </FieldLabel>
      </div>

      <MetaEditor entry={draft} onChange={update} />

      <div className="space-y-1">
        <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Testo (Markdown)
        </span>
        <Suspense fallback={<div className="h-56 animate-pulse rounded-lg border border-line bg-bg" />}>
          <MarkdownEditor
            label="Testo della voce"
            value={draft.body}
            linkOptions={options}
            onChange={(body) => update({ ...draft, body })}
          />
        </Suspense>
        <p className="text-[11px] text-muted">
          Scrivi <code>[[</code> per collegare voci, incantesimi e condizioni; <code>[[Nome|testo]]</code> per
          mostrare un testo diverso.
        </p>
      </div>

      <ConfirmDialog
        open={rename !== null}
        title="Aggiornare i collegamenti?"
        confirmLabel="Aggiorna"
        onCancel={() => void applyRename(false)}
        onConfirm={() => void applyRename(true)}
      >
        Hai rinominato “{originalTitle.current}” in “{draft.title}”. Ci sono {rename?.links} collegamenti in{' '}
        {rename?.sources} note che usano il vecchio nome: vuoi aggiornarli?
      </ConfirmDialog>
    </div>
  );
}
