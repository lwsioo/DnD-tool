import { describe, expect, it } from 'vitest';
import { deriveCharacter } from '../derive';
import type { Character } from '@/domain/character';
import type { InventoryItem } from '@/domain/items';
import { cls, feature, makeCharacter, weaponItem } from './fixtures';

/** Guerriero 5 (PB +3), FOR 16 (+3), DES 14 (+2), competente nelle armi semplici e da guerra. */
const fighter = (items: InventoryItem[], extra?: (d: Character) => void) =>
  makeCharacter((d) => {
    d.classes = [cls('fighter', 5, 10)];
    d.abilities.str = { base: 16, bonus: 0 };
    d.abilities.dex = { base: 14, bonus: 0 };
    d.proficiencies.weapons = ['simple', 'martial'];
    d.inventory.items = items;
    extra?.(d as Character);
  });

const attack = (c: Character, i = 0) => deriveCharacter(c).attacks[i]!;

const longsword = (hand: 'main' | 'two' = 'main') =>
  weaponItem('Spada lunga', {
    baseId: 'longsword',
    category: 'martial',
    damage: { dice: '1d8', type: 'slashing' },
    versatileDice: '1d10',
    properties: [{ key: 'versatile' }],
    mastery: 'sap',
    hand,
  });

describe('attacchi con arma', () => {
  it('mischia: FOR + competenza al tiro, FOR ai danni', () => {
    const a = attack(fighter([longsword()]));
    expect(a).toMatchObject({ ability: 'str', proficient: true });
    expect(a.toHit.total).toBe(6);
    expect(a.damage.text).toBe('1d8 + 3');
    expect(a.reach).toBe(5);
  });

  it('Versatile a due mani usa il dado maggiore', () => {
    const a = attack(fighter([longsword('two')]));
    expect(a.usingVersatile).toBe(true);
    expect(a.damage.text).toBe('1d10 + 3');
  });

  it('Accurata usa la migliore tra FOR e DES', () => {
    const rapier = weaponItem('Stocco', { category: 'martial', properties: [{ key: 'finesse' }] });
    expect(attack(fighter([rapier])).ability).toBe('str');
    const nimble = fighter([rapier], (d) => {
      d.abilities.dex = { base: 18, bonus: 0 };
    });
    expect(attack(nimble)).toMatchObject({ ability: 'dex', toHit: { total: 7 } });
  });

  it('a distanza usa DES; Lancio e Gittata riportano la gittata', () => {
    const bow = weaponItem('Arco lungo', {
      category: 'martial',
      type: 'ranged',
      damage: { dice: '1d8', type: 'piercing' },
      properties: [{ key: 'ammunition' }, { key: 'range', normal: 150, long: 600 }, { key: 'heavy' }],
    });
    const handaxe = weaponItem('Ascia', {
      properties: [{ key: 'light' }, { key: 'thrown', normal: 20, long: 60 }],
    });
    const d = deriveCharacter(fighter([bow, handaxe]));
    expect(d.attacks[0]).toMatchObject({
      ability: 'dex',
      range: { normal: 150, long: 600 },
      reach: undefined,
    });
    expect(d.attacks[0]!.toHit.total).toBe(5);
    expect(d.attacks[1]).toMatchObject({ ability: 'str', range: { normal: 20, long: 60 }, reach: 5 });
  });

  it('senza competenza niente bonus di competenza', () => {
    const c = fighter([longsword()], (d) => {
      d.proficiencies.weapons = ['simple'];
    });
    const a = attack(c);
    expect(a.proficient).toBe(false);
    expect(a.toHit.total).toBe(3);
    expect(a.notes[0]).toContain('competenza');
  });

  it('competenza per arma specifica (baseId)', () => {
    const c = fighter([longsword()], (d) => {
      d.proficiencies.weapons = ['longsword'];
    });
    expect(attack(c).proficient).toBe(true);
  });

  it('bonus magico a tiro e danni, effetti a distanza (Stile Tiro)', () => {
    const bow = weaponItem('Arco corto +1', {
      type: 'ranged',
      magicBonus: 1,
      properties: [{ key: 'range', normal: 80, long: 320 }],
    });
    const c = fighter([bow], (d) => {
      d.features = [feature('Stile Tiro', [{ target: 'attack.ranged', op: 'add', value: '2' }])];
    });
    const a = attack(c);
    expect(a.toHit.total).toBe(2 + 3 + 1 + 2);
    expect(a.damage.modifier).toBe(3);
  });

  it('mano secondaria: niente modificatore positivo ai danni', () => {
    const dagger = weaponItem('Pugnale', { properties: [{ key: 'light' }, { key: 'finesse' }], hand: 'off' });
    expect(attack(fighter([dagger])).damage.text).toBe('1d6');
  });

  it('Maestria attiva solo se sbloccata', () => {
    expect(attack(fighter([longsword()])).masteryUnlocked).toBe(false);
    const c = fighter([longsword()], (d) => {
      d.weaponMasteries = ['longsword'];
    });
    expect(attack(c)).toMatchObject({ mastery: 'sap', masteryUnlocked: true });
  });

  it('condizioni: svantaggio agli attacchi', () => {
    const c = fighter([longsword()], (d) => {
      d.combat.conditions = ['poisoned'];
    });
    const d = deriveCharacter(c, {
      conditionEffects: { poisoned: [{ id: 'p', target: 'attack.all', op: 'disadvantage' }] },
      conditionNames: { poisoned: 'Avvelenato' },
    });
    expect(d.attacks[0]!.toHit).toMatchObject({ mode: 'disadvantage', disadvantage: ['Avvelenato'] });
  });
});
