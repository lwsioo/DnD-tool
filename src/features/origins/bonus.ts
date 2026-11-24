import type { Ability } from '@/domain/abilities';

/** Converte la scelta dei selettori in bonus per caratteristica. */
export function bonusFromPicks(
  mode: 'twoOne' | 'threeOnes',
  picks: Ability[],
): Partial<Record<Ability, number>> {
  const out: Partial<Record<Ability, number>> = {};
  if (mode === 'twoOne') {
    const [plus2, plus1] = picks;
    if (plus2) out[plus2] = 2;
    if (plus1 && plus1 !== plus2) out[plus1] = 1;
  } else {
    for (const a of new Set(picks.slice(0, 3))) out[a] = 1;
  }
  return out;
}
