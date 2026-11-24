import { describe, expect, it } from 'vitest';
import { normalizeKey } from '../normalizeKey';

describe('normalizeKey', () => {
  it.each([
    ['Palla di Fuoco', 'palla di fuoco'],
    ['  Città   dell’Ombra ', "citta dell'ombra"],
    ['NÉVÈ', 'neve'],
    ['Tempio\tdi\nPelor', 'tempio di pelor'],
  ])('%j → %j', (input, expected) => {
    expect(normalizeKey(input)).toBe(expected);
  });
});
