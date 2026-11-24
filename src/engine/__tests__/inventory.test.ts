import { describe, expect, it } from 'vitest';
import { coinWeightLb, exchange, optimize, pay, totalCp, totalGp } from '../currency';
import { carriedWeightLb, computeEncumbrance } from '../encumbrance';
import type { Currency, InventoryItem } from '@/domain/items';
import { makeCharacter } from './fixtures';

const cur = (c: Partial<Currency>): Currency => ({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...c });

describe('valute', () => {
  it('valore totale', () => {
    const c = cur({ cp: 5, sp: 3, ep: 1, gp: 2, pp: 1 });
    expect(totalCp(c)).toBe(5 + 30 + 50 + 200 + 1000);
    expect(totalGp(c)).toBeCloseTo(12.85);
  });

  it('ottimizza nel minor numero di monete (senza electrum)', () => {
    expect(optimize(1285)).toEqual(cur({ pp: 1, gp: 2, sp: 8, cp: 5 }));
    expect(optimize(1285, ['gp', 'sp', 'cp'])).toEqual(cur({ gp: 12, sp: 8, cp: 5 }));
  });

  it('cambio con resto', () => {
    const r = exchange(cur({ sp: 15 }), 'sp', 'gp', 15);
    expect(r).toEqual({ ok: true, currency: cur({ gp: 1, sp: 5 }) });
    expect(exchange(cur({ gp: 1 }), 'gp', 'cp', 1)).toEqual({ ok: true, currency: cur({ cp: 100 }) });
    expect(exchange(cur({ gp: 1 }), 'gp', 'sp', 2)).toMatchObject({ ok: false });
  });

  it('pagare conserva le monete grandi e dà il resto', () => {
    expect(pay(cur({ gp: 1 }), 10)).toEqual({ ok: true, currency: cur({ sp: 9 }) });
    expect(pay(cur({ pp: 1, gp: 3, cp: 7 }), 250)).toEqual({
      ok: true,
      currency: cur({ pp: 1, gp: 0, sp: 5, cp: 7 }),
    });
    expect(pay(cur({ sp: 2 }), 50)).toMatchObject({ ok: false });
  });

  it('peso: 50 monete = 1 lb', () => {
    expect(coinWeightLb(cur({ gp: 100, sp: 50 }))).toBe(3);
  });
});

describe('ingombro', () => {
  const item = (id: string, weightLb: number, extra: Partial<InventoryItem> = {}): InventoryItem => ({
    id,
    parentId: null,
    kind: 'gear',
    name: id,
    quantity: 1,
    equipped: false,
    effects: [],
    weightLb,
    ...extra,
  });

  it('somma quantità × peso; il contenuto della Borsa Conservante non pesa', () => {
    const items = [
      item('zaino', 5, { kind: 'container', container: { weightless: false, collapsed: false } }),
      item('corda', 5, { parentId: 'zaino' }),
      item('razioni', 2, { parentId: 'zaino', quantity: 5 }),
      item('borsa', 15, { kind: 'container', container: { weightless: true, collapsed: false } }),
      item('lingotto', 50, { parentId: 'borsa' }),
      item('pozione', 0.5, { parentId: 'lingotto-sacca' }),
      item('lingotto-sacca', 1, { parentId: 'borsa' }),
    ];
    expect(carriedWeightLb(items)).toBe(5 + 5 + 10 + 15);
  });

  it('variante: Ingombrato oltre FOR × 5', () => {
    const c = makeCharacter((d) => {
      d.settings.encumbranceRule = 'variant';
      d.inventory.items = [item('incudine', 60)];
    });
    expect(computeEncumbrance(c, 10)).toMatchObject({ weightLb: 60, capacityLb: 150, status: 'encumbered' });
    expect(computeEncumbrance(c, 13).status).toBe('ok');
  });
});
