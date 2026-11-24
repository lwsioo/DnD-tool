import { describe, expect, it } from 'vitest';
import { deriveCharacter } from '../derive';
import { armorItem, cls, feature, makeCharacter, shieldItem, weaponItem } from './fixtures';

describe('deriveCharacter — scenario completo', () => {
  /** Guerriero 1: FOR 16, DES 12, COS 14; cotta di maglia + scudo + spada lunga. */
  const fighter = makeCharacter((d) => {
    d.classes = [cls('fighter', 1, 10)];
    d.abilities.str = { base: 15, bonus: 1 };
    d.abilities.dex = { base: 12, bonus: 0 };
    d.abilities.con = { base: 13, bonus: 1 };
    d.saves.str = 1;
    d.saves.con = 1;
    d.skills.athletics = { prof: 1 };
    d.skills.perception = { prof: 1 };
    d.proficiencies.armor = ['light', 'medium', 'heavy', 'shield'];
    d.proficiencies.weapons = ['simple', 'martial'];
    d.weaponMasteries = ['longsword'];
    d.combat.hp = { current: 12, temp: 0, maxMode: 'auto' };
    d.inventory.items = [
      armorItem('Cotta di maglia', {
        category: 'heavy',
        baseAc: 16,
        strRequirement: 13,
        stealthDisadvantage: true,
      }),
      shieldItem(),
      weaponItem('Spada lunga', {
        baseId: 'longsword',
        category: 'martial',
        damage: { dice: '1d8', type: 'slashing' },
        versatileDice: '1d10',
        properties: [{ key: 'versatile' }],
        mastery: 'sap',
      }),
    ];
    d.features = [
      feature('Recuperare Energie', [], {
        uses: { max: '2', used: 1, recharge: { shortRest: 1, longRest: 'all' }, pinned: true },
      }),
      feature('Risorsa rotta', [], {
        uses: { max: 'mod.xyz', used: 0, recharge: { shortRest: 0, longRest: 'all' }, pinned: false },
      }),
    ];
  });

  const d = deriveCharacter(fighter);

  it('statistiche base', () => {
    expect(d).toMatchObject({ level: 1, pb: 2 });
    expect(d.ac.total).toBe(18);
    expect(d.hp.max.total).toBe(12);
    expect(d.speed.walk.total).toBe(30);
    expect(d.initiative.total).toBe(1);
    expect(d.passive.perception.total).toBe(12);
    expect(d.saves.str.total).toBe(5);
    expect(d.skills.athletics.total).toBe(5);
    expect(d.skills.stealth.mode).toBe('disadvantage');
  });

  it('attacco con Maestria sbloccata', () => {
    expect(d.attacks).toHaveLength(1);
    expect(d.attacks[0]).toMatchObject({
      toHit: { total: 5 },
      damage: { text: '1d8 + 3' },
      masteryUnlocked: true,
    });
  });

  it('risorse con formula valutata e avviso per le formule errate', () => {
    expect(d.resources[0]).toMatchObject({
      name: 'Recuperare Energie',
      max: 2,
      used: 1,
      formulaError: false,
    });
    expect(d.resources[1]).toMatchObject({ max: 0, formulaError: true });
    expect(d.warnings.some((w) => w.includes('Risorsa rotta'))).toBe(true);
  });

  it('dadi vita', () => {
    expect(d.hitDice).toEqual([{ die: 10, total: 1, spent: 0, remaining: 1 }]);
  });

  it('personaggio vuoto: nessun errore, valori di base', () => {
    const blank = deriveCharacter(makeCharacter());
    expect(blank).toMatchObject({ level: 0, pb: 2, ac: { total: 10 }, hp: { max: { total: 0 } } });
    expect(blank.slots.mode).toBe('none');
    expect(blank.warnings).toEqual([]);
  });
});
