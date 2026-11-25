import type { Character } from '@/domain/character';

/**
 * Armi con Maestria per classe e livello (regole 2024): [livello, numero di armi].
 * Le Maestrie si possono cambiare (una per volta) a ogni Riposo Lungo.
 */
const MASTERY_PROGRESSION: Record<string, Array<[number, number]>> = {
  barbarian: [
    [1, 2],
    [4, 3],
    [10, 4],
  ],
  fighter: [
    [1, 3],
    [4, 4],
    [10, 5],
    [16, 6],
  ],
  paladin: [[1, 2]],
  ranger: [[1, 2]],
  rogue: [[1, 2]],
};

/** Quante armi con Maestria spettano al personaggio (con più classi conta la migliore); 0 = nessuna. */
export function masteryLimit(c: Pick<Character, 'classes'>): number {
  let best = 0;
  for (const cl of c.classes) {
    for (const [level, count] of MASTERY_PROGRESSION[cl.classKey] ?? []) {
      if (cl.level >= level) best = Math.max(best, count);
    }
  }
  return best;
}
