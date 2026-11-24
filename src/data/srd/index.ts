import type { Effect } from '@/domain/effects';
import type { DeriveContext } from '@/engine/types';
import { CONDITIONS, CONDITION_KEYS } from './conditions';

export { ARMOR, ARMOR_BY_ID, ARMOR_CATEGORY_LABELS, armorAcText, type ArmorBase } from './armor';
export { SRD_ATTRIBUTION } from './attribution';
export { CLASSES, CLASSES_BY_KEY, type ClassBase } from './classes';
export { CONDITIONS, CONDITION_KEYS, type ConditionEntry, type ConditionKey } from './conditions';
export { DAMAGE_TYPE_LABELS, RARE_LANGUAGES, STANDARD_LANGUAGES } from './languages';
export type { RuleEntry } from './types';
export { WEAPON_MASTERIES } from './weaponMasteries';
export { WEAPON_PROPERTIES } from './weaponProperties';
export { WEAPONS, WEAPONS_BY_ID, weaponDataFromBase, type WeaponBase } from './weapons';

/** Contesto del motore di calcolo con gli effetti delle condizioni SRD. */
export const SRD_DERIVE_CONTEXT: DeriveContext = {
  conditionEffects: Object.fromEntries(CONDITION_KEYS.map((k) => [k, CONDITIONS[k].effects])) as Record<
    string,
    Effect[]
  >,
  conditionNames: Object.fromEntries(CONDITION_KEYS.map((k) => [k, CONDITIONS[k].name])),
};
