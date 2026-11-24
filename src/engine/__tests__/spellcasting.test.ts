import { describe, expect, it } from 'vitest';
import { deriveCharacter } from '../derive';
import { cantripDiceAt, upcastExtra } from '../spellcasting';
import { multiclassCasterLevel, pactMagic, standardSlotMaxima } from '../spellSlots';
import { FULL_CASTER_SLOTS } from '@/data/srd/slotTables';
import type { ClassEntry } from '@/domain/character';
import { cls, feature, makeCharacter } from './fixtures';

const row = (...slots: number[]) => [...slots, ...Array(9 - slots.length).fill(0)];
const c = (caster: ClassEntry['caster'], level: number) => ({ caster, level });

describe('tabelle slot', () => {
  it('la tabella completa ha 20 righe coerenti', () => {
    expect(FULL_CASTER_SLOTS).toHaveLength(20);
    expect(FULL_CASTER_SLOTS[19]).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it.each([
    ['Mago 1', [c('full', 1)], row(2)],
    ['Mago 5', [c('full', 5)], row(4, 3, 2)],
    ['Chierico 20', [c('full', 20)], row(4, 3, 3, 3, 3, 2, 2, 1, 1)],
    ['Paladino 1 (2024: slot dal 1°)', [c('half', 1)], row(2)],
    ['Paladino 2', [c('half', 2)], row(2)],
    ['Paladino 5', [c('half', 5)], row(4, 2)],
    ['Ranger 9', [c('half', 9)], row(4, 3, 2)],
    ['Ranger 17', [c('half', 17)], row(4, 3, 3, 3, 1)],
    ['Ranger 20', [c('half', 20)], row(4, 3, 3, 3, 2)],
    ['Cavaliere Mistico 2', [c('third', 2)], row()],
    ['Cavaliere Mistico 3', [c('third', 3)], row(2)],
    ['Cavaliere Mistico 4', [c('third', 4)], row(3)],
    ['Cavaliere Mistico 7', [c('third', 7)], row(4, 2)],
    ['Mistificatore Arcano 13', [c('third', 13)], row(4, 3, 2)],
    ['Mistificatore Arcano 19', [c('third', 19)], row(4, 3, 3, 1)],
    ['Guerriero 5 + Mago 3 (single: solo il mago)', [c('none', 5), c('full', 3)], row(4, 2)],
    ['Paladino 4 + Stregone 3 → liv. incantatore 5', [c('half', 4), c('full', 3)], row(4, 3, 2)],
    ['Paladino 3 + Ranger 3 → liv. 3 (metà per eccesso)', [c('half', 3), c('half', 3)], row(4, 2)],
    ['Mago 2 + Cavaliere Mistico 4 → liv. 3', [c('full', 2), c('third', 4)], row(4, 2)],
  ])('%s', (_label, classes, expected) => {
    expect(standardSlotMaxima(classes).max).toEqual(expected);
  });

  it('il Warlock non entra nel livello da incantatore', () => {
    expect(standardSlotMaxima([c('pact', 5), c('full', 2)])).toMatchObject({ mode: 'single', max: row(3) });
    expect(multiclassCasterLevel([c('pact', 5)])).toBe(0);
  });

  it.each([
    [1, 1, 1],
    [2, 2, 1],
    [5, 2, 3],
    [9, 2, 5],
    [11, 3, 5],
    [17, 4, 5],
  ])('Magia del Patto, Warlock %d: %d slot di %d° livello', (level, slots, slotLevel) => {
    expect(pactMagic([c('pact', level)])).toEqual({ slots, slotLevel });
  });

  it('Paladino 2 / Warlock 3: slot standard e del patto separati, override e usati', () => {
    const ch = makeCharacter((d) => {
      d.classes = [cls('paladin', 2, 10, 'half'), cls('warlock', 3, 8, 'pact')];
      d.spellcasting.slots = { used: [1, 0, 0, 0, 0, 0, 0, 0, 0], maxOverride: [null, 1] };
      d.spellcasting.pact = { used: 5 };
    });
    const { slots } = deriveCharacter(ch);
    expect(slots.mode).toBe('single');
    expect(slots.standard[0]).toEqual({ level: 1, max: 2, used: 1 });
    expect(slots.standard[1]).toEqual({ level: 2, max: 1, used: 0 });
    expect(slots.pact).toEqual({ max: 2, slotLevel: 2, used: 2 });
  });
});

describe('caratteristica da incantatore', () => {
  it('CD = 8 + PB + mod, attacco = PB + mod, preparati contati per fonte', () => {
    const ch = makeCharacter((d) => {
      d.classes = [cls('wizard', 5, 6, 'full')];
      d.abilities.int = { base: 18, bonus: 0 };
      d.abilities.cha = { base: 12, bonus: 0 };
      d.spellcasting.sources = [
        { id: 's1', label: 'Mago', ability: 'int', preparedMax: 'mod.int + lvl.wizard' },
        { id: 's2', label: 'Iniziato alla Magia', ability: 'cha' },
      ];
      d.spellcasting.spells = [
        { id: 'a', spellId: 'x', sourceId: 's1', status: 'prepared' },
        { id: 'b', spellId: 'y', sourceId: 's1', status: 'alwaysPrepared' },
        { id: 'c', spellId: 'z', sourceId: 's2', status: 'free' },
      ];
      d.features = [
        feature('Bacchetta del Mago di Guerra +1', [
          { target: 'spell.attack', op: 'add', value: '1' },
          { target: 'spell.dc', op: 'add', value: '1' },
        ]),
      ];
    });
    const [wiz, feat] = deriveCharacter(ch).spellcasting;
    expect(wiz).toMatchObject({
      mod: 4,
      dc: { total: 16 },
      attack: { total: 8 },
      preparedCount: 1,
      preparedMax: 9,
    });
    expect(feat).toMatchObject({ mod: 1, dc: { total: 13 }, attack: { total: 5 }, preparedCount: 0 });
  });
});

describe('scaling', () => {
  const fireBolt = {
    scaling: { cantrip: ['1d10', '2d10', '3d10', '4d10'] as [string, string, string, string] },
  };
  it.each([
    [1, '1d10'],
    [4, '1d10'],
    [5, '2d10'],
    [11, '3d10'],
    [17, '4d10'],
  ])('trucchetto a livello %d → %s', (lvl, dice) => expect(cantripDiceAt(fireBolt, lvl)).toBe(dice));

  it('upcast: dadi extra per livello di slot sopra il base', () => {
    const fireball = { level: 3 as const, scaling: { perSlot: '1d6' } };
    expect(upcastExtra(fireball, 3)).toBeUndefined();
    expect(upcastExtra(fireball, 5)).toBe('2d6');
  });
});
