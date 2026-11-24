import { describe, expect, it } from 'vitest';
import { deriveCharacter } from '../derive';
import type { Character } from '@/domain/character';
import { armorItem, feature, makeCharacter, shieldItem } from './fixtures';

const ac = (c: Character) => deriveCharacter(c).ac;

/** DES 16 (+3), COS 14 (+2), SAG 14 (+2), FOR 13, addestrato in tutto. */
const withStats = (extra: (d: Character) => void) =>
  makeCharacter((d) => {
    d.abilities.dex = { base: 16, bonus: 0 };
    d.abilities.con = { base: 14, bonus: 0 };
    d.abilities.wis = { base: 14, bonus: 0 };
    d.abilities.str = { base: 13, bonus: 0 };
    d.proficiencies.armor = ['light', 'medium', 'heavy', 'shield'];
    extra(d as Character);
  });

const unarmoredBarbarian = feature('Difesa senza Armatura (Barbaro)', [
  { target: 'ac.formula', op: 'formula', value: '10 + mod.dex + mod.con', requires: ['noArmor'] },
]);
const unarmoredMonk = feature('Difesa senza Armatura (Monaco)', [
  { target: 'ac.formula', op: 'formula', value: '10 + mod.dex + mod.wis', requires: ['noArmor', 'noShield'] },
]);
const mageArmor = feature('Armatura Magica', [
  { target: 'ac.formula', op: 'formula', value: '13 + mod.dex', requires: ['noArmor'] },
]);
const defenseStyle = feature('Stile Difesa', [
  { target: 'ac', op: 'add', value: '1', requires: ['armorEquipped'] },
]);

describe('Classe Armatura', () => {
  it.each<[string, (d: Character) => void, number]>([
    ['senza armatura: 10 + DES', () => {}, 13],
    [
      'armatura leggera: base + DES pieno',
      (d) => void (d.inventory.items = [armorItem('Cuoio borchiato', { category: 'light', baseAc: 12 })]),
      15,
    ],
    [
      'armatura media: DES massimo +2',
      (d) => void (d.inventory.items = [armorItem('Mezza armatura', { category: 'medium', baseAc: 15 })]),
      17,
    ],
    [
      'armatura pesante: niente DES',
      (d) => void (d.inventory.items = [armorItem('Corazza a piastre', { category: 'heavy', baseAc: 18 })]),
      18,
    ],
    [
      'armatura magica +1 e scudo',
      (d) =>
        void (d.inventory.items = [
          armorItem('Cotta di maglia +1', { category: 'heavy', baseAc: 16, magicBonus: 1 }),
          shieldItem(),
        ]),
      19,
    ],
    ['solo scudo: 10 + DES + 2', (d) => void (d.inventory.items = [shieldItem()]), 15],
    ['Difesa senza Armatura del Barbaro', (d) => void (d.features = [unarmoredBarbarian]), 15],
    [
      'Barbaro senza armatura può usare lo scudo',
      (d) => {
        d.features = [unarmoredBarbarian];
        d.inventory.items = [shieldItem()];
      },
      17,
    ],
    [
      'Barbaro in armatura: vince l’armatura (formula esclusa)',
      (d) => {
        d.features = [unarmoredBarbarian];
        d.inventory.items = [armorItem('Giaco di maglia', { category: 'medium', baseAc: 13 })];
      },
      15,
    ],
    ['Monaco senza armatura e senza scudo', (d) => void (d.features = [unarmoredMonk]), 15],
    [
      'Monaco con scudo: perde la formula',
      (d) => {
        d.features = [unarmoredMonk];
        d.inventory.items = [shieldItem()];
      },
      15,
    ],
    ['Armatura Magica: 13 + DES', (d) => void (d.features = [mageArmor]), 16],
    [
      'Stile Difesa solo in armatura',
      (d) => {
        d.features = [defenseStyle];
        d.inventory.items = [armorItem('Corazza a piastre', { category: 'heavy', baseAc: 18 })];
      },
      19,
    ],
    ['Stile Difesa senza armatura: nessun bonus', (d) => void (d.features = [defenseStyle]), 13],
    [
      'armatura nello zaino (non equipaggiata) non conta',
      (d) => void (d.inventory.items = [armorItem('Corazza', { category: 'heavy', baseAc: 18 }, false)]),
      13,
    ],
    [
      'anello di protezione da sintonizzare: conta solo se sintonizzato',
      (d) =>
        void (d.inventory.items = [
          {
            ...shieldItem('Anello di protezione'),
            kind: 'gear',
            shield: undefined,
            attunement: 'required',
            effects: [{ id: 'r', target: 'ac', op: 'add', value: '1' }],
          },
        ]),
      13,
    ],
  ])('%s → %d', (_label, setup, expected) => {
    expect(ac(withStats(setup)).total).toBe(expected);
  });

  it('scudo senza addestramento non dà bonus (2024)', () => {
    const c = withStats((d) => {
      d.proficiencies.armor = ['light'];
      d.inventory.items = [shieldItem()];
    });
    expect(ac(c)).toMatchObject({ total: 13, shieldIgnored: true });
  });

  it('valore manuale sovrascrive il calcolo', () => {
    const c = withStats((d) => {
      d.combat.acOverride = 21;
      d.inventory.items = [shieldItem()];
    });
    expect(ac(c)).toMatchObject({ total: 21, override: true });
  });

  it('scomposizione leggibile', () => {
    const c = withStats((d) => {
      d.inventory.items = [armorItem('Mezza armatura', { category: 'medium', baseAc: 15 }), shieldItem()];
    });
    expect(ac(c).parts).toEqual([
      { label: 'Mezza armatura', value: 15 },
      { label: 'Mod. DES (max 2)', value: 2 },
      { label: 'Scudo', value: 2 },
    ]);
  });

  it('armatura pesante con FOR insufficiente: −10 ft di velocità', () => {
    const c = withStats((d) => {
      d.inventory.items = [
        armorItem('Corazza a piastre', { category: 'heavy', baseAc: 18, strRequirement: 15 }),
      ];
    });
    expect(deriveCharacter(c).speed.walk.total).toBe(20);
  });

  it('Afferrato: velocità 0 anche con bonus', () => {
    const c = withStats((d) => {
      d.combat.speed = { walk: 30, fly: 60 };
      d.features = [feature('Mobile', [{ target: 'speed', op: 'add', value: '10' }])];
      d.combat.conditions = ['grappled'];
    });
    const d = deriveCharacter(c, {
      conditionEffects: { grappled: [{ id: 'g', target: 'speed', op: 'set', value: '0' }] },
    });
    expect(d.speed.walk.total).toBe(0);
    expect(d.speed.fly?.total).toBe(0);
  });
});
