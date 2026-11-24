import { ABILITIES, type Ability } from '@/domain/abilities';
import type { Character } from '@/domain/character';
import { evaluateOr, type FormulaVars } from './formula';
import type { ActiveEffect, Part } from './types';

export const MAX_SCORE = 30;

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export interface AbilityStat {
  score: number;
  mod: number;
  parts: Part[];
}

/**
 * Punteggi finali: base + bonus (background/ASI/talenti) + effetti 'add' su score.X;
 * gli effetti 'set' fissano un minimo (Guanti della Potenza dell'Orco: FOR 19). Tetto 30.
 * Le formule degli effetti sui punteggi possono usare solo pb e livelli (i modificatori non esistono ancora).
 */
export function computeAbilities(
  c: Character,
  effects: ActiveEffect[],
  baseVars: Omit<FormulaVars, 'mods' | 'scores'>,
): Record<Ability, AbilityStat> {
  const vars: FormulaVars = { ...baseVars, mods: {}, scores: {} };
  const out = {} as Record<Ability, AbilityStat>;

  for (const ab of ABILITIES) {
    const { base, bonus } = c.abilities[ab];
    const parts: Part[] = [{ label: 'Base', value: base }];
    if (bonus) parts.push({ label: 'Incrementi', value: bonus });

    const relevant = effects.filter((e) => e.target === `score.${ab}`);
    for (const e of relevant.filter((x) => x.op === 'add')) {
      const v = Math.trunc(evaluateOr(e.value, vars));
      if (v) parts.push({ label: e.source, value: v });
    }
    let score = parts.reduce((a, p) => a + p.value, 0);

    for (const e of relevant.filter((x) => x.op === 'set')) {
      const v = Math.trunc(evaluateOr(e.value, vars));
      if (v > score) {
        parts.push({ label: `${e.source} (fissa ${v})`, value: v - score });
        score = v;
      }
    }
    if (score > MAX_SCORE) {
      parts.push({ label: `Massimo ${MAX_SCORE}`, value: MAX_SCORE - score });
      score = MAX_SCORE;
    }
    out[ab] = { score, mod: abilityMod(score), parts };
  }
  return out;
}
