import type { Ability, SkillKey } from './abilities';
import type { Formula, ID } from './primitives';

/**
 * Bersaglio di un effetto. È il meccanismo unico con cui privilegi, oggetti e condizioni
 * modificano la scheda (CA, abilità, TS, attacchi, velocità…).
 */
export type EffectTarget =
  | `score.${Ability}`
  | 'ac'
  | 'ac.formula'
  | 'initiative'
  | 'speed'
  | 'hp.max'
  | 'passive.perception'
  | `save.${Ability}`
  | 'save.all'
  | `check.${Ability}`
  | `skill.${SkillKey}`
  | 'attack.all'
  | 'attack.melee'
  | 'attack.ranged'
  | 'damage.melee'
  | 'damage.ranged'
  | 'spell.dc'
  | 'spell.attack'
  | 'd20.all';

export type EffectOp =
  /** Somma `value` (formula). */
  | 'add'
  /**
   * Imposta un valore. Su `score.*` è un minimo (FOR 19 dei Guanti della Potenza dell'Orco
   * non abbassa una FOR 20); su `speed` è un tetto (Afferrato → 0).
   */
  | 'set'
  /** Solo per `ac.formula`: formula alternativa di CA, es. "10 + mod.dex + mod.con". */
  | 'formula'
  | 'advantage'
  | 'disadvantage'
  | 'proficiency'
  | 'expertise';

export type EffectRequirement = 'noArmor' | 'noShield' | 'armorEquipped' | 'shieldEquipped';

export interface Effect {
  id: ID;
  target: EffectTarget;
  op: EffectOp;
  value?: Formula;
  requires?: EffectRequirement[];
  /** Mostrata nel tooltip del badge, es. "Armatura pesante". */
  note?: string;
}
