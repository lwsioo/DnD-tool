export interface DiceTerm {
  count: number;
  sides: number;
}

/** "2d6" → { count: 2, sides: 6 }; null se non è un'espressione NdM semplice. */
export function parseDice(dice: string): DiceTerm | null {
  const m = /^\s*(\d*)\s*d\s*(\d+)\s*$/i.exec(dice);
  if (!m) return null;
  return { count: m[1] ? Number(m[1]) : 1, sides: Number(m[2]) };
}

/** Moltiplica il numero di dadi: "1d6" × 3 → "3d6". Se non è NdM restituisce la stringa invariata. */
export function multiplyDice(dice: string, times: number): string {
  const d = parseDice(dice);
  if (!d || times <= 0) return times <= 0 ? '' : dice;
  return `${d.count * times}d${d.sides}`;
}

/** Valore medio di NdM. */
export function averageDice(dice: string): number {
  const d = parseDice(dice);
  return d ? (d.count * (d.sides + 1)) / 2 : 0;
}

/** Formatta un bonus con segno: 3 → "+3", -1 → "−1" (meno tipografico), 0 → "+0". */
export function formatBonus(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : `+${n}`;
}

/** "1d8" + 3 → "1d8 + 3"; "1d8" − 1 → "1d8 − 1"; "1d8" + 0 → "1d8". */
export function formatDamage(dice: string, modifier: number): string {
  if (modifier === 0) return dice;
  return `${dice} ${modifier < 0 ? '−' : '+'} ${Math.abs(modifier)}`;
}

/** Tiro casuale (per il riposo breve). `rng` iniettabile per i test. */
export function rollDie(sides: number, rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * sides);
}
