import { X } from 'lucide-react';
import { CONDITION_KEYS, CONDITIONS, type ConditionKey } from '@/data/srd/conditions';
import { useUiStore } from '@/stores/uiStore';
import { useSheet } from './SheetContext';

const isKnown = (k: string): k is ConditionKey => k in CONDITIONS;

/** Condizioni attive: si aggiungono e tolgono in gioco; i loro effetti entrano subito nei calcoli. */
export function ConditionsBar() {
  const { character: c, mutate } = useSheet();
  const openInspector = useUiStore((s) => s.openInspector);
  const active = c.combat.conditions;
  const available = CONDITION_KEYS.filter((k) => k !== 'exhaustion' && !active.includes(k));

  return (
    <section aria-label="Condizioni" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Condizioni</span>
      {active.length === 0 && <span className="text-xs text-muted">nessuna</span>}
      {active.map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 rounded-full border border-danger/50 bg-danger/10 py-0.5 pr-1 pl-2.5 text-xs text-danger"
        >
          <button
            type="button"
            className="hover:underline"
            onClick={() => isKnown(k) && openInspector({ kind: 'condition', key: k })}
          >
            {isKnown(k) ? CONDITIONS[k].name : k}
          </button>
          <button
            type="button"
            aria-label={`Rimuovi ${isKnown(k) ? CONDITIONS[k].name : k}`}
            className="rounded-full p-0.5 hover:bg-danger/20"
            onClick={() =>
              mutate((d) => void (d.combat.conditions = d.combat.conditions.filter((x) => x !== k)))
            }
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <select
        aria-label="Aggiungi condizione"
        value=""
        onChange={(e) => {
          const k = e.target.value;
          if (k) mutate((d) => void d.combat.conditions.push(k));
        }}
        className="rounded-full border border-dashed border-line bg-transparent px-2.5 py-0.5 text-xs text-muted"
      >
        <option value="">+ condizione</option>
        {available.map((k) => (
          <option key={k} value={k}>
            {CONDITIONS[k].name}
          </option>
        ))}
      </select>
    </section>
  );
}
