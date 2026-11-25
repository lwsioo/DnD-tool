import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import { CONDITION_KEYS, CONDITIONS } from '@/data/srd/conditions';
import { CATEGORY_INFO } from '../categories';
import type { LinkIndex } from './resolve';
import { m } from '@/i18n';

export interface LinkOption {
  label: string;
  detail: string;
  /** Priorità nell'elenco: voci della campagna prima di incantesimi e regole. */
  boost: number;
}

/** Nomi proponibili dopo `[[`: titoli e alias della campagna, incantesimi, condizioni. */
export function linkOptions(index: LinkIndex): LinkOption[] {
  const out = new Map<string, LinkOption>();
  for (const e of index.wiki.values()) {
    out.set(e.title, { label: e.title, detail: CATEGORY_INFO[e.category].singular, boost: 2 });
  }
  for (const s of index.spells.values()) {
    if (!out.has(s.name)) out.set(s.name, { label: s.name, detail: m.wiki.spell, boost: 1 });
  }
  for (const k of CONDITION_KEYS) {
    const name = CONDITIONS[k].name;
    if (!out.has(name)) out.set(name, { label: name, detail: m.wiki.condition, boost: 0 });
  }
  return [...out.values()];
}

/** Inserisce il nome e chiude con `]]`, se non è già chiuso. */
function applyLink(label: string) {
  return (view: EditorView, _c: Completion, from: number, to: number) => {
    const closed = view.state.sliceDoc(to, to + 2) === ']]';
    const insert = closed ? label : `${label}]]`;
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length + (closed ? 2 : 0) },
    });
  };
}

/** Sorgente di autocompletamento CodeMirror per i [[wikilink]]. */
export function wikilinkCompletionSource(getOptions: () => LinkOption[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/\[\[[^\]|\n]*/);
    if (!match) return null;
    return {
      from: match.from + 2,
      options: getOptions().map((o) => ({
        label: o.label,
        detail: o.detail,
        boost: o.boost,
        type: o.boost === 2 ? 'class' : 'text',
        apply: applyLink(o.label),
      })),
      validFor: /^[^\]|\n]*$/,
    };
  };
}
