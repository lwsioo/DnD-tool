import type { Character } from '@/domain/character';

/** Somma dei livelli di tutte le classi (0 per un personaggio senza classi). */
export function totalLevel(c: Pick<Character, 'classes'>): number {
  return c.classes.reduce((acc, cl) => acc + Math.max(0, cl.level), 0);
}

/** Livelli per classKey (due voci con la stessa classe si sommano). */
export function classLevels(c: Pick<Character, 'classes'>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const cl of c.classes) out[cl.classKey] = (out[cl.classKey] ?? 0) + Math.max(0, cl.level);
  return out;
}

/** Bonus di competenza: +2 ai livelli 1–4, +3 a 5–8, … +6 a 17–20. Un personaggio senza livelli vale come liv. 1. */
export function proficiencyBonus(level: number): number {
  const l = Math.min(20, Math.max(1, level));
  return 2 + Math.floor((l - 1) / 4);
}
