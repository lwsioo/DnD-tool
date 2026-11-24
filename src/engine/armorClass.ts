import { ABILITY_LABELS } from '@/data/i18n/it';
import type { Ability } from '@/domain/abilities';
import type { Character } from '@/domain/character';
import { addParts, type EquipmentState } from './effects';
import { evaluateOr, type FormulaVars } from './formula';
import type { ActiveEffect, Breakdown, Part } from './types';

export const SHIELD_DEFAULT_BONUS = 2;

export interface AcResult extends Breakdown {
  /** Come è stata calcolata la base: nome dell'armatura, "Senza armatura" o fonte della formula. */
  basis: string;
  override: boolean;
  /** Scudo imbracciato senza addestramento: nessun bonus alla CA (regola 2024). */
  shieldIgnored: boolean;
}

interface Candidate {
  basis: string;
  parts: Part[];
}

const total = (parts: Part[]) => parts.reduce((a, p) => a + p.value, 0);
const dexLabel = `Mod. ${ABILITY_LABELS.dex.short}`;

/**
 * CA = migliore tra (armatura | 10 + DES | formule alternative attive) + scudo + bonus.
 * Le formule alternative (Difesa senza Armatura, Armatura Magica…) sono effetti 'ac.formula'
 * i cui requisiti (noArmor, noShield) sono già stati filtrati in collectEffects.
 */
export function computeArmorClass(
  c: Character,
  eq: EquipmentState,
  mods: Record<Ability, number>,
  effects: ActiveEffect[],
  vars: FormulaVars,
): AcResult {
  if (c.combat.acOverride !== undefined) {
    return {
      total: c.combat.acOverride,
      parts: [{ label: 'Valore manuale', value: c.combat.acOverride }],
      basis: 'Valore manuale',
      override: true,
      shieldIgnored: false,
    };
  }

  const candidates: Candidate[] = [];
  const armor = eq.armor?.armor;
  if (eq.armor && armor) {
    const dex = armor.dexCap === null ? mods.dex : Math.min(mods.dex, armor.dexCap);
    const parts: Part[] = [{ label: eq.armor.name, value: armor.baseAc }];
    if (armor.magicBonus) parts.push({ label: 'Bonus magico armatura', value: armor.magicBonus });
    if (dex)
      parts.push({
        label: armor.dexCap === null ? dexLabel : `${dexLabel} (max ${armor.dexCap})`,
        value: dex,
      });
    candidates.push({ basis: eq.armor.name, parts });
  } else {
    candidates.push({
      basis: 'Senza armatura',
      parts: [
        { label: 'Senza armatura', value: 10 },
        ...(mods.dex ? [{ label: dexLabel, value: mods.dex }] : []),
      ],
    });
  }

  for (const e of effects) {
    if (e.target !== 'ac.formula' || e.op !== 'formula') continue;
    const value = Math.trunc(evaluateOr(e.value, vars, -Infinity));
    if (Number.isFinite(value)) {
      candidates.push({ basis: e.source, parts: [{ label: `${e.source} (${e.value})`, value }] });
    }
  }

  // A parità vince la prima (armatura o base), più leggibile.
  const best = candidates.reduce((a, b) => (total(b.parts) > total(a.parts) ? b : a));
  const parts = [...best.parts];

  let shieldIgnored = false;
  if (eq.shield) {
    if (eq.shieldTrained) {
      parts.push({ label: eq.shield.name, value: eq.shield.shield?.acBonus ?? SHIELD_DEFAULT_BONUS });
    } else {
      shieldIgnored = true;
    }
  }
  parts.push(...addParts(effects, ['ac'], vars));

  return { total: total(parts), parts, basis: best.basis, override: false, shieldIgnored };
}
