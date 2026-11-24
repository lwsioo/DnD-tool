import { ABILITY_LABELS } from '@/data/i18n/it';
import type { Ability } from '@/domain/abilities';
import type { Character } from '@/domain/character';
import type { DamageType, Feet, ID } from '@/domain/primitives';
import type { InventoryItem, MasteryKey, WeaponData, WeaponPropertyRef } from '@/domain/items';
import { formatDamage } from '@/lib/dice';
import { addParts, rollModeFor } from './effects';
import type { FormulaVars } from './formula';
import type { ActiveEffect, Breakdown, Part, RollModeInfo } from './types';

export interface AttackStat {
  itemId: ID;
  name: string;
  equipped: boolean;
  ability: Ability;
  proficient: boolean;
  toHit: Breakdown & RollModeInfo;
  damage: {
    dice: string;
    modifier: number;
    type: DamageType;
    /** "1d8 + 3" */
    text: string;
    modifierParts: Part[];
  };
  /** Impugnata a due mani con dado Versatile. */
  usingVersatile: boolean;
  properties: WeaponPropertyRef[];
  mastery?: MasteryKey;
  masteryUnlocked: boolean;
  /** Gittata normale/lunga per Gittata o Lancio. */
  range?: { normal: Feet; long: Feet };
  /** Portata in mischia (5 ft, 10 ft con Portata); undefined per armi a distanza. */
  reach?: Feet;
  notes: string[];
}

const hasProp = (w: WeaponData, key: WeaponPropertyRef['key']) => w.properties.some((p) => p.key === key);

/** Caratteristica d'attacco: forzata › Accurata (la migliore tra FOR e DES) › DES a distanza, FOR in mischia. */
export function attackAbility(w: WeaponData, mods: Record<Ability, number>): Ability {
  if (w.abilityOverride) return w.abilityOverride;
  if (hasProp(w, 'finesse')) return mods.dex > mods.str ? 'dex' : 'str';
  return w.type === 'ranged' ? 'dex' : 'str';
}

export function isWeaponProficient(c: Character, w: WeaponData): boolean {
  const known = c.proficiencies.weapons;
  return known.includes(w.category) || (!!w.baseId && known.includes(w.baseId));
}

export function computeAttack(
  c: Character,
  item: InventoryItem & { weapon: WeaponData },
  mods: Record<Ability, number>,
  pb: number,
  effects: ActiveEffect[],
  vars: FormulaVars,
): AttackStat {
  const w = item.weapon;
  const ability = attackAbility(w, mods);
  const mod = mods[ability];
  const proficient = isWeaponProficient(c, w);
  const kind = w.type === 'ranged' ? 'attack.ranged' : 'attack.melee';
  const notes: string[] = [];

  const hitParts: Part[] = [{ label: `Mod. ${ABILITY_LABELS[ability].short}`, value: mod }];
  if (proficient) hitParts.push({ label: 'Competenza', value: pb });
  else notes.push('Nessuna competenza con quest’arma');
  if (w.magicBonus) hitParts.push({ label: 'Bonus magico', value: w.magicBonus });
  const hitTargets = ['attack.all', kind, 'd20.all'] as const;
  hitParts.push(...addParts(effects, hitTargets, vars));

  const usingVersatile = w.hand === 'two' && !!w.versatileDice && hasProp(w, 'versatile');
  const dice = usingVersatile ? w.versatileDice! : w.damage.dice;

  const dmgParts: Part[] = [];
  // Attacco extra con arma Leggera nella mano secondaria: niente modificatore positivo.
  const abilityDamage = w.hand === 'off' ? Math.min(0, mod) : mod;
  if (w.hand === 'off' && mod > 0)
    notes.push('Mano secondaria: il modificatore positivo non si aggiunge ai danni');
  if (abilityDamage) dmgParts.push({ label: `Mod. ${ABILITY_LABELS[ability].short}`, value: abilityDamage });
  if (w.magicBonus) dmgParts.push({ label: 'Bonus magico', value: w.magicBonus });
  dmgParts.push(...addParts(effects, [w.type === 'ranged' ? 'damage.ranged' : 'damage.melee'], vars));
  const modifier = dmgParts.reduce((a, p) => a + p.value, 0);

  const ranged = w.properties.find((p) => p.key === 'range' || p.key === 'thrown');
  const masteryUnlocked = !!w.mastery && !!w.baseId && c.weaponMasteries.includes(w.baseId);

  return {
    itemId: item.id,
    name: item.name,
    equipped: item.equipped,
    ability,
    proficient,
    toHit: {
      total: hitParts.reduce((a, p) => a + p.value, 0),
      parts: hitParts,
      ...rollModeFor(effects, hitTargets),
    },
    damage: {
      dice,
      modifier,
      type: w.damage.type,
      text: formatDamage(dice, modifier),
      modifierParts: dmgParts,
    },
    usingVersatile,
    properties: w.properties,
    mastery: w.mastery,
    masteryUnlocked,
    range: ranged && 'normal' in ranged ? { normal: ranged.normal, long: ranged.long } : undefined,
    reach: w.type === 'melee' ? (hasProp(w, 'reach') ? 10 : 5) : undefined,
    notes,
  };
}

export function computeAttacks(
  c: Character,
  mods: Record<Ability, number>,
  pb: number,
  effects: ActiveEffect[],
  vars: FormulaVars,
): AttackStat[] {
  return c.inventory.items
    .filter((i): i is InventoryItem & { weapon: WeaponData } => i.kind === 'weapon' && !!i.weapon)
    .map((i) => computeAttack(c, i, mods, pb, effects, vars));
}
