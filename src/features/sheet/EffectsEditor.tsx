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
import { m } from '@/i18n';

const TARGET_OPTIONS: Array<{ value: EffectTarget; label: string }> = [
  { value: 'ac', label: 'CA' },
  { value: 'ac.formula', label: m.sheet.effectTargets.acFormula },
  { value: 'initiative', label: m.sheet.effectTargets.initiative },
  { value: 'speed', label: m.sheet.effectTargets.speed },
  { value: 'hp.max', label: m.sheet.effectTargets.hpMax },
  { value: 'passive.perception', label: m.sheet.effectTargets.passivePerception },
  { value: 'attack.all', label: m.sheet.effectTargets.attackAll },
  { value: 'attack.melee', label: m.sheet.effectTargets.attackMelee },
  { value: 'attack.ranged', label: m.sheet.effectTargets.attackRanged },
  { value: 'damage.melee', label: m.sheet.effectTargets.damageMelee },
  { value: 'damage.ranged', label: m.sheet.effectTargets.damageRanged },
  { value: 'spell.dc', label: m.sheet.effectTargets.spellDc },
  { value: 'spell.attack', label: m.sheet.effectTargets.spellAttack },
  { value: 'save.all', label: m.sheet.effectTargets.saveAll },
  { value: 'd20.all', label: m.sheet.effectTargets.d20All },
  ...ABILITIES.map((a) => ({
    value: `score.${a}` as const,
    label: m.sheet.effectTargets.score(ABILITY_LABELS[a].long),
  })),
  ...ABILITIES.map((a) => ({ value: `save.${a}` as const, label: m.sheet.effectTargets.save(ABILITY_LABELS[a].long) })),
  ...ABILITIES.map((a) => ({ value: `check.${a}` as const, label: m.sheet.effectTargets.check(ABILITY_LABELS[a].long) })),
  ...SKILLS.map((s) => ({ value: `skill.${s}` as const, label: m.sheet.effectTargets.skill(SKILL_LABELS[s]) })),
];

const OP_OPTIONS: Array<{ value: EffectOp; label: string }> = [
  { value: 'add', label: m.sheet.effectOps.add },
  { value: 'advantage', label: m.sheet.effectOps.advantage },
  { value: 'disadvantage', label: m.sheet.effectOps.disadvantage },
  { value: 'proficiency', label: m.sheet.effectOps.proficiency },
  { value: 'expertise', label: m.sheet.effectOps.expertise },
  { value: 'set', label: m.sheet.effectOps.set },
  { value: 'formula', label: m.sheet.effectOps.formula },
];

const REQ_LABELS: Record<EffectRequirement, string> = {
  ...m.terms.requirements,
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
              label={m.sheet.effectTarget}
              value={e.target}
              options={TARGET_OPTIONS}
              onValue={(v) => setEffect(e.id, { target: v })}
            />
            <Select
              label={m.sheet.effectType}
              value={e.op}
              options={OP_OPTIONS}
              onValue={(v) => setEffect(e.id, { op: v })}
            />
            {needsValue(e.op) ? (
              <input
                aria-label={m.sheet.effectValue}
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
              label={m.sheet.removeEffect}
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
        {m.sheet.addEffect}
      </Button>
    </div>
  );
}
