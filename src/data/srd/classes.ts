import type { Ability } from '@/domain/abilities';
import type { ArmorTraining, CasterProgression } from '@/domain/character';
import type { Die } from '@/domain/primitives';
import { LOCALE } from '@/i18n/locale';

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
  /** Caratteristiche primarie della classe. */
  primary: Ability[];
  /** Serie standard consigliata dal manuale, in ordine FOR, DES, COS, INT, SAG, CAR. */
  recommended: [number, number, number, number, number, number];
}

// prettier-ignore
const CLASSES_IT: ClassBase[] = [
  { key: 'barbarian', name: 'Barbaro', nameEn: 'Barbarian', hitDie: 12, saves: ['str', 'con'], caster: 'none', armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'], skillChoices: 2, primary: ['str'], recommended: [15, 13, 14, 10, 12, 8] },
  { key: 'bard', name: 'Bardo', nameEn: 'Bard', hitDie: 8, saves: ['dex', 'cha'], caster: 'full', spellcastingAbility: 'cha', armor: ['light'], weapons: ['simple'], skillChoices: 3, primary: ['cha'], recommended: [8, 14, 12, 13, 10, 15] },
  { key: 'cleric', name: 'Chierico', nameEn: 'Cleric', hitDie: 8, saves: ['wis', 'cha'], caster: 'full', spellcastingAbility: 'wis', armor: ['light', 'medium', 'shield'], weapons: ['simple'], skillChoices: 2, primary: ['wis'], recommended: [14, 8, 13, 10, 15, 12] },
  { key: 'druid', name: 'Druido', nameEn: 'Druid', hitDie: 8, saves: ['int', 'wis'], caster: 'full', spellcastingAbility: 'wis', armor: ['light', 'shield'], weapons: ['simple'], skillChoices: 2, primary: ['wis'], recommended: [8, 12, 14, 13, 15, 10] },
  { key: 'fighter', name: 'Guerriero', nameEn: 'Fighter', hitDie: 10, saves: ['str', 'con'], caster: 'none', armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'], skillChoices: 2, primary: ['str', 'dex'], recommended: [15, 14, 13, 8, 10, 12] },
  { key: 'monk', name: 'Monaco', nameEn: 'Monk', hitDie: 8, saves: ['str', 'dex'], caster: 'none', armor: [], weapons: ['simple'], skillChoices: 2, primary: ['dex', 'wis'], recommended: [12, 15, 13, 10, 14, 8] },
  { key: 'paladin', name: 'Paladino', nameEn: 'Paladin', hitDie: 10, saves: ['wis', 'cha'], caster: 'half', spellcastingAbility: 'cha', armor: ['light', 'medium', 'heavy', 'shield'], weapons: ['simple', 'martial'], skillChoices: 2, primary: ['str', 'cha'], recommended: [15, 10, 13, 8, 12, 14] },
  { key: 'ranger', name: 'Ranger', nameEn: 'Ranger', hitDie: 10, saves: ['str', 'dex'], caster: 'half', spellcastingAbility: 'wis', armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'], skillChoices: 3, primary: ['dex', 'wis'], recommended: [12, 15, 13, 8, 14, 10] },
  { key: 'rogue', name: 'Ladro', nameEn: 'Rogue', hitDie: 8, saves: ['dex', 'int'], caster: 'none', armor: ['light'], weapons: ['simple'], skillChoices: 4, primary: ['dex'], recommended: [12, 15, 13, 14, 10, 8] },
  { key: 'sorcerer', name: 'Stregone', nameEn: 'Sorcerer', hitDie: 6, saves: ['con', 'cha'], caster: 'full', spellcastingAbility: 'cha', armor: [], weapons: ['simple'], skillChoices: 2, primary: ['cha'], recommended: [10, 13, 14, 8, 12, 15] },
  { key: 'warlock', name: 'Warlock', nameEn: 'Warlock', hitDie: 8, saves: ['wis', 'cha'], caster: 'pact', spellcastingAbility: 'cha', armor: ['light'], weapons: ['simple'], skillChoices: 2, primary: ['cha'], recommended: [8, 14, 13, 12, 10, 15] },
  { key: 'wizard', name: 'Mago', nameEn: 'Wizard', hitDie: 6, saves: ['int', 'wis'], caster: 'full', spellcastingAbility: 'int', armor: [], weapons: ['simple'], skillChoices: 2, primary: ['int'], recommended: [8, 12, 13, 15, 14, 10] },
];

/** Classi SRD nella lingua attiva (in inglese con i nomi ufficiali). */
export const CLASSES: ClassBase[] =
  LOCALE === 'en' ? CLASSES_IT.map((c) => ({ ...c, name: c.nameEn })) : CLASSES_IT;

/** Chiave della classe SRD da un nome in italiano o in inglese (es. «Stregone» o «Sorcerer» → 'sorcerer'). */
export function classKeyFromName(name: string): string | undefined {
  const n = name.trim().toLowerCase();
  return CLASSES_IT.find((c) => c.name.toLowerCase() === n || c.nameEn.toLowerCase() === n)?.key;
}

export const CLASSES_BY_KEY: ReadonlyMap<string, ClassBase> = new Map(CLASSES.map((c) => [c.key, c]));

/**
 * Nome di classe nella lingua attiva: «Wizard» e «Mago» diventano lo stesso nome, così filtri e confronti
 * funzionano anche con incantesimi importati quando l'app era in un'altra lingua. I nomi sconosciuti restano.
 */
export function canonicalClass(name: string): string {
  const key = classKeyFromName(name);
  return (key && CLASSES_BY_KEY.get(key)?.name) || name;
}
