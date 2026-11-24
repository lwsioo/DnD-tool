import type { Character } from '@/domain/character';
import type { Feet } from '@/domain/primitives';
import { addParts, effectsFor, type EquipmentState } from './effects';
import { evaluateOr, type FormulaVars } from './formula';
import type { ActiveEffect, Breakdown, Part } from './types';

export type SpeedKind = 'walk' | 'fly' | 'swim' | 'climb' | 'burrow';

export type SpeedResult = Record<'walk', Breakdown> & Partial<Record<Exclude<SpeedKind, 'walk'>, Breakdown>>;

/**
 * Velocità: base + bonus/malus (Indebolimento −5 ft per livello) − 10 ft se l'armatura pesante
 * richiede più FOR di quella posseduta. Gli effetti 'set' (Afferrato, Trattenuto → 0) fanno da tetto.
 * Bonus e tetti si applicano a tutte le velocità del personaggio.
 */
export function computeSpeed(
  c: Character,
  eq: EquipmentState,
  strScore: number,
  effects: ActiveEffect[],
  vars: FormulaVars,
): SpeedResult {
  const shared: Part[] = [];
  const req = eq.armor?.armor?.strRequirement;
  if (req && strScore < req) shared.push({ label: `${eq.armor!.name} (FOR ${req} richiesta)`, value: -10 });
  shared.push(...addParts(effects, ['speed'], vars));

  const caps = effectsFor(effects, ['speed'])
    .filter((e) => e.op === 'set')
    .map((e) => ({ source: e.source, value: Math.trunc(evaluateOr(e.value, vars, Infinity)) }));
  const cap = caps.reduce<{ source: string; value: number } | null>(
    (lowest, x) => (!lowest || x.value < lowest.value ? x : lowest),
    null,
  );

  const compute = (base: Feet, label: string): Breakdown => {
    const parts: Part[] = [{ label, value: base }, ...shared];
    let total = Math.max(
      0,
      parts.reduce((a, p) => a + p.value, 0),
    );
    if (cap && cap.value < total) {
      parts.push({ label: cap.source, value: cap.value - total });
      total = cap.value;
    }
    return { total, parts };
  };

  const s = c.combat.speed;
  const result: SpeedResult = { walk: compute(s.walk, 'Base') };
  if (s.fly) result.fly = compute(s.fly, 'Volare');
  if (s.swim) result.swim = compute(s.swim, 'Nuotare');
  if (s.climb) result.climb = compute(s.climb, 'Scalare');
  if (s.burrow) result.burrow = compute(s.burrow, 'Scavare');
  return result;
}
