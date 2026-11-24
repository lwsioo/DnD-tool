import type { Ability, SkillKey } from '@/domain/abilities';
import type { Currency } from '@/domain/items';

/** Etichette italiane dei termini di gioco. Le chiavi interne restano inglesi. */

export const ABILITY_LABELS: Record<Ability, { short: string; long: string }> = {
  str: { short: 'FOR', long: 'Forza' },
  dex: { short: 'DES', long: 'Destrezza' },
  con: { short: 'COS', long: 'Costituzione' },
  int: { short: 'INT', long: 'Intelligenza' },
  wis: { short: 'SAG', long: 'Saggezza' },
  cha: { short: 'CAR', long: 'Carisma' },
};

export const SKILL_LABELS: Record<SkillKey, string> = {
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
};

export const CURRENCY_LABELS: Record<keyof Currency, { short: string; long: string }> = {
  cp: { short: 'MR', long: 'Monete di rame' },
  sp: { short: 'MA', long: "Monete d'argento" },
  ep: { short: 'ME', long: 'Monete di electrum' },
  gp: { short: 'MO', long: "Monete d'oro" },
  pp: { short: 'MP', long: 'Monete di platino' },
};
