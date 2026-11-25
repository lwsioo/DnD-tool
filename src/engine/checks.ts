import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import { SKILL_ABILITY, type Ability, type ProfLevel, type SkillKey } from '@/domain/abilities';
import type { EffectTarget } from '@/domain/effects';
import { addParts, grantedProficiency, rollModeFor } from './effects';
import type { FormulaVars } from './formula';
import type { ActiveEffect, Part, RollStat } from './types';
import { m } from '@/i18n';

const PROF_LABEL: Record<Exclude<ProfLevel, 0>, string> = {
  0.5: m.engine.halfProficiency,
  1: m.engine.proficiency,
  2: m.engine.expertise,
};

export function profPart(pb: number, prof: ProfLevel): Part | null {
  if (prof === 0) return null;
  return { label: PROF_LABEL[prof], value: Math.floor(pb * prof) };
}

const maxProf = (a: ProfLevel, b: ProfLevel): ProfLevel => (a >= b ? a : b);

interface RollInput {
  ability: Ability;
  mod: number;
  baseProf: ProfLevel;
  /** Bersaglio su cui cercare effetti di competenza/maestria. */
  profTarget: EffectTarget;
  /** Bersagli di bonus e vantaggio/svantaggio, dal più specifico al più generico. */
  targets: readonly EffectTarget[];
  pb: number;
  effects: ActiveEffect[];
  vars: FormulaVars;
}

function computeRoll(input: RollInput): RollStat {
  const prof = maxProf(input.baseProf, grantedProficiency(input.effects, input.profTarget));
  const parts: Part[] = [{ label: m.engine.mod(ABILITY_LABELS[input.ability].short), value: input.mod }];
  const p = profPart(input.pb, prof);
  if (p) parts.push(p);
  parts.push(...addParts(input.effects, input.targets, input.vars));
  return {
    total: parts.reduce((a, x) => a + x.value, 0),
    parts,
    prof,
    ...rollModeFor(input.effects, input.targets),
  };
}

type Shared = Pick<RollInput, 'pb' | 'effects' | 'vars'>;

export function computeSave(ability: Ability, mod: number, baseProf: ProfLevel, shared: Shared): RollStat {
  return computeRoll({
    ...shared,
    ability,
    mod,
    baseProf,
    profTarget: `save.${ability}`,
    targets: [`save.${ability}`, 'save.all', 'd20.all'],
  });
}

export function computeSkill(
  skill: SkillKey,
  abilityMods: Record<Ability, number>,
  baseProf: ProfLevel,
  abilityOverride: Ability | undefined,
  shared: Shared,
): RollStat & { ability: Ability; label: string } {
  const ability = abilityOverride ?? SKILL_ABILITY[skill];
  return {
    ...computeRoll({
      ...shared,
      ability,
      mod: abilityMods[ability],
      baseProf,
      profTarget: `skill.${skill}`,
      targets: [`skill.${skill}`, `check.${ability}`, 'd20.all'],
    }),
    ability,
    label: SKILL_LABELS[skill],
  };
}

/** Iniziativa = prova di DES: si applicano anche i bonus/vantaggi alle prove di DES. */
export function computeInitiative(dexMod: number, shared: Shared): RollStat {
  return computeRoll({
    ...shared,
    ability: 'dex',
    mod: dexMod,
    baseProf: 0,
    profTarget: 'initiative',
    targets: ['initiative', 'check.dex', 'd20.all'],
  });
}

/** Valore passivo: 10 + bonus dell'abilità, ±5 con vantaggio/svantaggio. */
export function passiveScore(
  skill: RollStat,
  effects: ActiveEffect[],
  vars: FormulaVars,
  skillKey: SkillKey,
) {
  const parts: Part[] = [
    { label: m.engine.base, value: 10 },
    { label: SKILL_LABELS[skillKey], value: skill.total },
  ];
  if (skill.mode === 'advantage') parts.push({ label: m.engine.advantage, value: 5 });
  if (skill.mode === 'disadvantage') parts.push({ label: m.engine.disadvantage, value: -5 });
  if (skillKey === 'perception') parts.push(...addParts(effects, ['passive.perception'], vars));
  return { total: parts.reduce((a, p) => a + p.value, 0), parts };
}
