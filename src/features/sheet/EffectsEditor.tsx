import { Plus, X } from 'lucide-react';
import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import { ABILITIES, SKILLS } from '@/domain/abilities';
import type { Effect, EffectOp, EffectRequirement, EffectTarget } from '@/domain/effects';
import { tryEvaluateFormula, type FormulaVars } from '@/engine/formula';
import { describeEffect } from '@/features/inspector/describeEffect';
import { newId } from '@/lib/id';
import { Button } from '@/ui/Button';
import { inputClass, Select } from '@/ui/fields';
import { IconButton } from '@/ui/IconButton';

const TARGET_OPTIONS: Array<{ value: EffectTarget; label: string }> = [
  { value: 'ac', label: 'CA' },
  { value: 'ac.formula', label: 'CA alternativa (formula)' },
  { value: 'initiative', label: 'Iniziativa' },
  { value: 'speed', label: 'Velocità' },
  { value: 'hp.max', label: 'PF massimi' },
  { value: 'passive.perception', label: 'Percezione passiva' },
  { value: 'attack.all', label: 'Tiri per colpire (tutti)' },
  { value: 'attack.melee', label: 'Tiri per colpire in mischia' },
  { value: 'attack.ranged', label: 'Tiri per colpire a distanza' },
  { value: 'damage.melee', label: 'Danni in mischia' },
  { value: 'damage.ranged', label: 'Danni a distanza' },
  { value: 'spell.dc', label: 'CD incantesimi' },
  { value: 'spell.attack', label: 'Attacco con incantesimi' },
  { value: 'save.all', label: 'Tiri salvezza (tutti)' },
  { value: 'd20.all', label: 'Tutti i tiri d20' },
  ...ABILITIES.map((a) => ({
    value: `score.${a}` as const,
    label: `Punteggio di ${ABILITY_LABELS[a].long}`,
  })),
  ...ABILITIES.map((a) => ({ value: `save.${a}` as const, label: `TS su ${ABILITY_LABELS[a].long}` })),
  ...ABILITIES.map((a) => ({ value: `check.${a}` as const, label: `Prove di ${ABILITY_LABELS[a].long}` })),
  ...SKILLS.map((s) => ({ value: `skill.${s}` as const, label: `Abilità: ${SKILL_LABELS[s]}` })),
];

const OP_OPTIONS: Array<{ value: EffectOp; label: string }> = [
  { value: 'add', label: 'Bonus (+/−)' },
  { value: 'advantage', label: 'Vantaggio' },
  { value: 'disadvantage', label: 'Svantaggio' },
  { value: 'proficiency', label: 'Competenza' },
  { value: 'expertise', label: 'Maestria' },
  { value: 'set', label: 'Imposta valore' },
  { value: 'formula', label: 'Formula di CA' },
];

const REQ_LABELS: Record<EffectRequirement, string> = {
  noArmor: 'senza armatura',
  noShield: 'senza scudo',
  armorEquipped: 'con armatura',
  shieldEquipped: 'con scudo',
};

const needsValue = (op: EffectOp) => op === 'add' || op === 'set' || op === 'formula';

/** Anteprima del valore di una formula con i dati del personaggio, o l'errore. */
export function FormulaPreview({ formula, vars }: { formula: string; vars: FormulaVars }) {
  if (!formula.trim()) return null;
  const r = tryEvaluateFormula(formula, vars);
  return r.ok ? (
    <span className="text-[11px] text-ok">= {Math.trunc(r.value)}</span>
  ) : (
    <span className="text-[11px] text-danger">{r.error}</span>
  );
}

interface EffectsEditorProps {
  effects: Effect[];
  onChange: (effects: Effect[]) => void;
  vars: FormulaVars;
}

/** Elenco modificabile di effetti (usato da privilegi e oggetti magici). */
export function EffectsEditor({ effects, onChange, vars }: EffectsEditorProps) {
  const setEffect = (id: string, patch: Partial<Effect>) =>
    onChange(effects.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-2">
      {effects.map((e) => (
        <div key={e.id} className="space-y-1 rounded-md border border-line p-2">
          <div className="grid items-center gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto]">
            <Select
              label="Bersaglio"
              value={e.target}
              options={TARGET_OPTIONS}
              onValue={(v) => setEffect(e.id, { target: v })}
            />
            <Select
              label="Tipo di effetto"
              value={e.op}
              options={OP_OPTIONS}
              onValue={(v) => setEffect(e.id, { op: v })}
            />
            {needsValue(e.op) ? (
              <input
                aria-label="Valore (formula)"
                className={inputClass}
                placeholder={e.op === 'formula' ? '13 + mod.dex' : '1 · pb · mod.cha'}
                value={e.value ?? ''}
                onChange={(ev) => setEffect(e.id, { value: ev.target.value })}
              />
            ) : (
              <span />
            )}
            <IconButton
              icon={X}
              label="Rimuovi effetto"
              onClick={() => onChange(effects.filter((x) => x.id !== e.id))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {(Object.keys(REQ_LABELS) as EffectRequirement[]).map((r) => (
              <label key={r} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={e.requires?.includes(r) ?? false}
                  onChange={(ev) => {
                    const next = new Set(e.requires ?? []);
                    if (ev.target.checked) next.add(r);
                    else next.delete(r);
                    setEffect(e.id, { requires: next.size ? [...next] : undefined });
                  }}
                />
                {REQ_LABELS[r]}
              </label>
            ))}
            <span className="ml-auto italic">{describeEffect(e)}</span>
            {needsValue(e.op) && e.value && <FormulaPreview formula={e.value} vars={vars} />}
          </div>
        </div>
      ))}
      <Button
        size="sm"
        icon={Plus}
        onClick={() => onChange([...effects, { id: newId(), target: 'ac', op: 'add', value: '1' }])}
      >
        Aggiungi effetto
      </Button>
    </div>
  );
}
