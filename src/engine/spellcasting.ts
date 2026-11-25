import { ABILITY_LABELS } from '@/data/i18n/it';
import type { Ability } from '@/domain/abilities';
import type { Character } from '@/domain/character';
import type { ID } from '@/domain/primitives';
import type { Spell } from '@/domain/spells';
import { multiplyDice } from '@/lib/dice';
import { addParts, rollModeFor } from './effects';
import { evaluateOr, type FormulaVars } from './formula';
import type { ActiveEffect, Breakdown, Part, RollModeInfo } from './types';
import { m } from '@/i18n';

export interface SpellcastingStat {
  sourceId: ID;
  label: string;
  ability: Ability;
  mod: number;
  /** CD Tiro Salvezza = 8 + competenza + modificatore (+ bonus). */
  dc: Breakdown;
  /** Bonus d'attacco con incantesimo = competenza + modificatore (+ bonus). */
  attack: Breakdown & RollModeInfo;
  preparedCount: number;
  preparedMax?: number;
}

export function computeSpellcasting(
  c: Character,
  mods: Record<Ability, number>,
  pb: number,
  effects: ActiveEffect[],
  vars: FormulaVars,
): SpellcastingStat[] {
  return c.spellcasting.sources.map((src) => {
    const mod = mods[src.ability];
    const modPart: Part = { label: m.engine.mod(ABILITY_LABELS[src.ability].short), value: mod };
    const dcParts: Part[] = [
      { label: m.engine.base, value: 8 },
      { label: m.engine.proficiency, value: pb },
      modPart,
      ...addParts(effects, ['spell.dc'], vars),
    ];
    const attackTargets = ['spell.attack', 'attack.all', 'd20.all'] as const;
    const attackParts: Part[] = [
      { label: m.engine.proficiency, value: pb },
      modPart,
      ...addParts(effects, attackTargets, vars),
    ];
    const preparedCount = c.spellcasting.spells.filter(
      (s) => s.sourceId === src.id && s.status === 'prepared',
    ).length;
    const preparedMax = src.preparedMax
      ? Math.max(0, Math.floor(evaluateOr(src.preparedMax, vars)))
      : undefined;
    return {
      sourceId: src.id,
      label: src.label,
      ability: src.ability,
      mod,
      dc: { total: dcParts.reduce((a, p) => a + p.value, 0), parts: dcParts },
      attack: {
        total: attackParts.reduce((a, p) => a + p.value, 0),
        parts: attackParts,
        ...rollModeFor(effects, attackTargets),
      },
      preparedCount,
      preparedMax,
    };
  });
}

/** Dadi di un trucchetto al livello del personaggio (soglie 5 / 11 / 17). */
export function cantripDiceAt(spell: Pick<Spell, 'scaling'>, characterLevel: number): string | undefined {
  const dice = spell.scaling?.cantrip;
  if (!dice) return undefined;
  const tier = characterLevel >= 17 ? 3 : characterLevel >= 11 ? 2 : characterLevel >= 5 ? 1 : 0;
  return dice[tier];
}

/** Dadi aggiuntivi lanciando con uno slot superiore: perSlot × (slot − livello base). */
export function upcastExtra(spell: Pick<Spell, 'scaling' | 'level'>, slotLevel: number): string | undefined {
  const per = spell.scaling?.perSlot;
  const steps = slotLevel - spell.level;
  if (!per || spell.level === 0 || steps <= 0) return undefined;
  return multiplyDice(per, steps);
}
