import { describe, expect, it } from 'vitest';
import { evaluateFormula, evaluateOr, tryEvaluateFormula, type FormulaVars } from '../formula';

const vars: FormulaVars = {
  pb: 3,
  lvl: 7,
  classLevels: { monk: 5, fighter: 2 },
  mods: { str: -1, dex: 3, con: 2, int: 0, wis: 2, cha: -1 },
  scores: { str: 8, dex: 16, con: 14, int: 10, wis: 15, cha: 9 },
};

describe('evaluateFormula', () => {
  it.each([
    ['3', 3],
    ['pb', 3],
    ['bc', 3],
    ['lvl', 7],
    ['liv', 7],
    ['lvl.monk', 5],
    ['lvl.wizard', 0],
    ['mod.dex', 3],
    ['mod.DES', 3],
    ['score.sag', 15],
    ['max(1, mod.cha)', 1],
    ['min(mod.dex, 2)', 2],
    ['floor(lvl.monk / 2) + 1', 3],
    ['ceil(7 / 2)', 4],
    ['2 * lvl', 14],
    ['-mod.str', 1],
    ['10 + mod.dex + mod.wis', 15],
    ['(1 + 2) * 3', 9],
    ['abs(-4) + round(2.5)', 7],
    ['1.5 * 2', 3],
  ])('%s = %d', (src, expected) => {
    expect(evaluateFormula(src, vars)).toBe(expected);
  });

  it.each([
    ['', 'vuota'],
    ['pb +', 'incompleta'],
    ['foo', 'sconosciuta'],
    ['mod.xyz', 'Caratteristica sconosciuta'],
    ['explode(1)', 'Funzione sconosciuta'],
    ['1 / 0', 'zero'],
    ['2 3', 'eccesso'],
    ['alert("x")', 'Carattere non ammesso'],
    ['max()', 'almeno un argomento'],
    ['(1 + 2', 'Atteso'],
  ])('rifiuta %j', (src, message) => {
    const r = tryEvaluateFormula(src, vars);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(message);
  });

  it('evaluateOr usa il fallback per formule vuote o errate', () => {
    expect(evaluateOr(undefined, vars, 5)).toBe(5);
    expect(evaluateOr('  ', vars, 5)).toBe(5);
    expect(evaluateOr('boom', vars, 5)).toBe(5);
    expect(evaluateOr('pb', vars, 5)).toBe(3);
  });
});
