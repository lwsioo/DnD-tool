import type { Ability } from '@/domain/abilities';
import type { ArmorTraining, CasterProgression } from '@/domain/character';
import type { Die } from '@/domain/primitives';

/** Dati meccanici delle 12 classi SRD 5.2 per precompilare la scheda (wizard, nuova classe). */
export interface ClassBase {
  key: string;
  name: string;
  nameEn: string;
  hitDie: Die;
  saves: [Ability, Ability];
  caster: CasterProgression;
  /** Caratteristica da incantatore predefinita (modificabile nella scheda). */
  spellcastingAbility?: Ability;
  armor: ArmorTraining[];
  weapons: string[];
  /** Numero di abilità da scegliere al 1° livello. */
  skillChoices: number;
}

// prettier-ignore
export const CLASSES: ClassBase[] = [
  { key: 'barbarian', name: 'Barbaro', nameEn: 'Barbarian', hitDie: 12, saves: ['str', 'con'], caster: 'none', armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'], skillChoices: 2 },
  { key: 'bard', name: 'Bardo', nameEn: 'Bard', hitDie: 8, saves: ['dex', 'cha'], caster: 'full', spellcastingAbility: 'cha', armor: ['light'], weapons: ['simple'], skillChoices: 3 },
  { key: 'cleric', name: 'Chierico', nameEn: 'Cleric', hitDie: 8, saves: ['wis', 'cha'], caster: 'full', spellcastingAbility: 'wis', armor: ['light', 'medium', 'shield'], weapons: ['simple'], skillChoices: 2 },
  { key: 'druid', name: 'Druido', nameEn: 'Druid', hitDie: 8, saves: ['int', 'wis'], caster: 'full', spellcastingAbility: 'wis', armor: ['light', 'shield'], weapons: ['simple'], skillChoices: 2 },
  { key: 'fighter', name: 'Guerriero', nameEn: 'Fighter', hitDie: 10, saves: ['str', 'con'], caster: 'none', armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'], skillChoices: 2 },
  { key: 'monk', name: 'Monaco', nameEn: 'Monk', hitDie: 8, saves: ['str', 'dex'], caster: 'none', armor: [], weapons: ['simple'], skillChoices: 2 },
  { key: 'paladin', name: 'Paladino', nameEn: 'Paladin', hitDie: 10, saves: ['wis', 'cha'], caster: 'half', spellcastingAbility: 'cha', armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'], skillChoices: 2 },
  { key: 'ranger', name: 'Ranger', nameEn: 'Ranger', hitDie: 10, saves: ['str', 'dex'], caster: 'half', spellcastingAbility: 'wis', armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'], skillChoices: 3 },
  { key: 'rogue', name: 'Ladro', nameEn: 'Rogue', hitDie: 8, saves: ['dex', 'int'], caster: 'none', armor: ['light'], weapons: ['simple'], skillChoices: 4 },
  { key: 'sorcerer', name: 'Stregone', nameEn: 'Sorcerer', hitDie: 6, saves: ['con', 'cha'], caster: 'full', spellcastingAbility: 'cha', armor: [], weapons: ['simple'], skillChoices: 2 },
  { key: 'warlock', name: 'Warlock', nameEn: 'Warlock', hitDie: 8, saves: ['wis', 'cha'], caster: 'pact', spellcastingAbility: 'cha', armor: ['light'], weapons: ['simple'], skillChoices: 2 },
  { key: 'wizard', name: 'Mago', nameEn: 'Wizard', hitDie: 6, saves: ['int', 'wis'], caster: 'full', spellcastingAbility: 'int', armor: [], weapons: ['simple'], skillChoices: 2 },
];

export const CLASSES_BY_KEY: ReadonlyMap<string, ClassBase> = new Map(CLASSES.map((c) => [c.key, c]));
