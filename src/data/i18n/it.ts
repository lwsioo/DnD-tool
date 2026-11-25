import type { Ability, SkillKey } from '@/domain/abilities';
import type { Currency } from '@/domain/items';
import { pick } from '@/i18n/locale';

/** Etichette dei termini di gioco nella lingua attiva. Le chiavi interne restano inglesi. */

export const ABILITY_LABELS: Record<Ability, { short: string; long: string }> = pick(
  {
    str: { short: 'FOR', long: 'Forza' },
    dex: { short: 'DES', long: 'Destrezza' },
    con: { short: 'COS', long: 'Costituzione' },
    int: { short: 'INT', long: 'Intelligenza' },
    wis: { short: 'SAG', long: 'Saggezza' },
    cha: { short: 'CAR', long: 'Carisma' },
  },
  {
    str: { short: 'STR', long: 'Strength' },
    dex: { short: 'DEX', long: 'Dexterity' },
    con: { short: 'CON', long: 'Constitution' },
    int: { short: 'INT', long: 'Intelligence' },
    wis: { short: 'WIS', long: 'Wisdom' },
    cha: { short: 'CHA', long: 'Charisma' },
  },
);

export const SKILL_LABELS: Record<SkillKey, string> = pick(
  {
    acrobatics: 'Acrobazia',
    animalHandling: 'Addestrare Animali',
    arcana: 'Arcano',
    athletics: 'Atletica',
    deception: 'Inganno',
    history: 'Storia',
    insight: 'Intuizione',
    intimidation: 'Intimidire',
    investigation: 'Indagare',
    medicine: 'Medicina',
    nature: 'Natura',
    perception: 'Percezione',
    performance: 'Intrattenere',
    persuasion: 'Persuasione',
    religion: 'Religione',
    sleightOfHand: 'Rapidità di Mano',
    stealth: 'Furtività',
    survival: 'Sopravvivenza',
  },
  {
    acrobatics: 'Acrobatics',
    animalHandling: 'Animal Handling',
    arcana: 'Arcana',
    athletics: 'Athletics',
    deception: 'Deception',
    history: 'History',
    insight: 'Insight',
    intimidation: 'Intimidation',
    investigation: 'Investigation',
    medicine: 'Medicine',
    nature: 'Nature',
    perception: 'Perception',
    performance: 'Performance',
    persuasion: 'Persuasion',
    religion: 'Religion',
    sleightOfHand: 'Sleight of Hand',
    stealth: 'Stealth',
    survival: 'Survival',
  },
);

export const CURRENCY_LABELS: Record<keyof Currency, { short: string; long: string }> = pick(
  {
    cp: { short: 'MR', long: 'Monete di rame' },
    sp: { short: 'MA', long: "Monete d'argento" },
    ep: { short: 'ME', long: 'Monete di electrum' },
    gp: { short: 'MO', long: "Monete d'oro" },
    pp: { short: 'MP', long: 'Monete di platino' },
  },
  {
    cp: { short: 'CP', long: 'Copper pieces' },
    sp: { short: 'SP', long: 'Silver pieces' },
    ep: { short: 'EP', long: 'Electrum pieces' },
    gp: { short: 'GP', long: 'Gold pieces' },
    pp: { short: 'PP', long: 'Platinum pieces' },
  },
);
