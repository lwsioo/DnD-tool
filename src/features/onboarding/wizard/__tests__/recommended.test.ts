import { describe, expect, it } from 'vitest';
import { CLASSES } from '@/data/srd/classes';
import {
  checkAbilities,
  initialDraft,
  pointBuySpent,
  recommendedArray,
  recommendedScores,
  STANDARD_ARRAY,
  suggestedBonus,
} from '../logic';

describe('caratteristiche consigliate per classe', () => {
  it.each(CLASSES.map((c) => [c.name, c.key]))(
    '%s: serie standard valida, 27 punti nel point buy',
    (_, key) => {
      const rec = recommendedArray(key)!;
      expect(Object.values(rec).sort((a, b) => b - a)).toEqual([...STANDARD_ARRAY]);
      expect(pointBuySpent(rec)).toBe(27);
      const cl = CLASSES.find((c) => c.key === key)!;
      // La caratteristica primaria ha sempre uno dei due valori più alti.
      expect(Math.max(...cl.primary.map((a) => rec[a]))).toBeGreaterThanOrEqual(14);
    },
  );

  it('serie standard e point buy usano i valori del manuale e superano il controllo', () => {
    for (const method of ['standard', 'pointbuy'] as const) {
      const d = { ...initialDraft(), classKey: 'sorcerer', method };
      const scores = recommendedScores(d)!;
      expect(scores).toMatchObject({ cha: 15, con: 14, dex: 13, wis: 12, str: 10, int: 8 });
      expect(checkAbilities({ ...d, scores }).ok).toBe(true);
    }
  });

  it('con i tiri, il valore più alto va alla caratteristica più importante', () => {
    const d = {
      ...initialDraft(),
      classKey: 'wizard',
      method: 'roll' as const,
      rolled: [9, 17, 12, 14, 11, 16],
    };
    expect(recommendedScores(d)).toEqual({ int: 17, wis: 16, con: 14, dex: 12, cha: 11, str: 9 });
    expect(recommendedScores({ ...d, rolled: [] })).toBeNull();
    expect(recommendedScores({ ...d, classKey: '' })).toBeNull();
  });

  it('aumenti suggeriti tra le caratteristiche del background', () => {
    expect(suggestedBonus('sorcerer', ['con', 'int', 'wis'])).toEqual(['con', 'wis']);
    expect(suggestedBonus('fighter')).toEqual(['str', 'dex']);
    expect(suggestedBonus('')).toEqual([]);
  });
});
