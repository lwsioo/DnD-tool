/** PE necessari per ciascun livello (indice = livello − 1), SRD 5.2. */
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000,
  225000, 265000, 305000, 355000,
] as const;

/** Livello corrispondente a un totale di PE. */
export function levelForXp(xp: number): number {
  let level = 1;
  XP_THRESHOLDS.forEach((t, i) => {
    if (xp >= t) level = i + 1;
  });
  return level;
}

/** PE per il livello successivo a quello dato, o null al 20°. */
export function xpForNextLevel(level: number): number | null {
  return level >= 20 ? null : (XP_THRESHOLDS[Math.max(1, level)] ?? null);
}
