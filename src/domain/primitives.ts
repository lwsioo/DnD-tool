/** Identificatore univoco (crypto.randomUUID). */
export type ID = string;

/** Testo in Markdown, con supporto ai wikilink [[Nome Voce]]. */
export type Markdown = string;

/**
 * Espressione numerica valutata dal motore (parser sicuro, niente eval).
 * Esempi: "2", "pb", "mod.cha", "max(1, mod.wis)", "lvl.monk", "floor(lvl / 2)".
 */
export type Formula = string;

/** Distanze: sempre salvate in piedi, mostrate in metri secondo le impostazioni (1,5 m = 5 ft). */
export type Feet = number;

export type Die = 4 | 6 | 8 | 10 | 12 | 20;

export interface Timestamps {
  createdAt: number;
  updatedAt: number;
}

export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder';
