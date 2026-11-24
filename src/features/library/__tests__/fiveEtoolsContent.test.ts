import { describe, expect, it } from 'vitest';
import { SRD_FEATS } from '@/data/srd/origins';
import { backgroundDefSchema, featDefSchema, libraryItemSchema, speciesDefSchema } from '@/db/schemas';
import {
  bundleToLibraryItems,
  convertBackground,
  convertFeat,
  convertFiveEtoolsFiles,
  convertItem,
  convertRace,
  isFiveEtoolsContent,
} from '../fiveEtoolsContent';

// Dati di prova inventati, nella forma dei file 5etools.
const race = {
  name: 'Testfolk',
  source: 'TST',
  size: ['S', 'M'],
  speed: { walk: 35 },
  darkvision: 60,
  skillProficiencies: [{ choose: { from: ['perception', 'sleight of hand'], count: 1 } }],
  feats: [{ any: 1 }],
  entries: [
    { type: 'entries', name: 'Creature Type', entries: ['Humanoid.'] },
    { type: 'entries', name: 'Lucky Step', entries: ['You can {@action Dash} as a bonus action.'] },
  ],
};

const feat = {
  name: 'Test Initiate',
  source: 'TST',
  category: 'O',
  repeatable: true,
  additionalSpells: [{ name: 'Cleric Spells' }, { name: 'Wizard Spells' }],
  entries: ['You learn some magic.'],
};

const background = {
  name: 'Tester',
  source: 'TST',
  ability: [{ choose: { weighted: { from: ['int', 'wis', 'cha'], weights: [2, 1] } } }],
  feats: [{ 'test initiate; cleric|tst': true }],
  skillProficiencies: [{ insight: true, 'animal handling': true }],
  toolProficiencies: [{ anyGamingSet: 1 }],
  startingEquipment: [
    {
      A: ['dagger|xphb', { item: 'arrow|xphb', quantity: 20 }, { special: 'Lucky coin' }, { value: 800 }],
      B: [{ value: 5000 }],
    },
  ],
  entries: ['A test background.'],
};

describe('convertitori 5etools', () => {
  it('specie: taglie, velocità, scurovisione, tratti e scelte', () => {
    const s = convertRace(race)!;
    expect(speciesDefSchema.safeParse(s).success).toBe(true);
    expect(s).toMatchObject({
      id: '5e-race-testfolk-tst',
      sizes: ['S', 'M'],
      speed: 35,
      darkvision: 60,
      skillChoice: { count: 1, from: ['perception', 'sleightOfHand'] },
      originFeat: true,
    });
    expect(s.traits.map((t) => t.name)).toEqual(['Lucky Step']);
    expect(s.traits[0]!.description).not.toContain('{@');
  });

  it('talento: categoria, ripetibile, liste di incantesimi in italiano', () => {
    const f = convertFeat(feat)!;
    expect(featDefSchema.safeParse(f).success).toBe(true);
    expect(f).toMatchObject({ category: 'origin', repeatable: true, spellLists: ['Chierico', 'Mago'] });
  });

  it('background: caratteristiche, talento collegato, competenze, equipaggiamento', () => {
    const f = convertFeat(feat)!;
    const b = convertBackground(background, (n) => (n === 'test initiate' ? f : undefined))!;
    expect(backgroundDefSchema.safeParse(b).success).toBe(true);
    expect(b).toMatchObject({
      abilities: ['int', 'wis', 'cha'],
      featId: f.id,
      featName: 'Test Initiate (Chierico)',
      skills: ['insight', 'animalHandling'],
      tools: ['Set da gioco (a scelta)'],
      equipmentGoldInA: 8,
      equipmentGold: 50,
    });
    expect(b.equipment).toEqual([
      { name: 'Dagger', quantity: 1, weaponId: 'dagger' },
      { name: 'Arrow', quantity: 20, weaponId: undefined },
      { name: 'Lucky coin', quantity: 1, weaponId: undefined },
    ]);
  });

  it('oggetti: arma magica su base SRD, armatura, anello con effetti', () => {
    const sword = convertItem({
      name: 'Test Blade',
      source: 'TST',
      type: 'M',
      baseItem: 'longsword|xphb',
      bonusWeapon: '+1',
      rarity: 'uncommon',
    })!;
    expect(sword.weapon).toMatchObject({ baseId: 'longsword', magicBonus: 1, damage: { dice: '1d8' } });
    expect(sword.rarity).toBe('uncommon');

    const plate = convertItem({
      name: 'Plate Armor',
      source: 'TST',
      type: 'HA|XPHB',
      ac: 18,
      stealth: true,
    })!;
    expect(plate.armor).toMatchObject({
      category: 'heavy',
      baseAc: 18,
      dexCap: 0,
      stealthDisadvantage: true,
    });

    const ring = convertItem({
      name: 'Test Ring',
      type: 'RG',
      bonusAc: '+1',
      bonusSavingThrow: '+1',
      reqAttune: true,
    })!;
    expect(ring.attunement).toBe('required');
    expect(ring.effects.map((e) => `${e.target} ${e.value}`)).toEqual(['ac 1', 'save.all 1']);

    const bow = convertItem({
      name: 'Odd Bow',
      type: 'R',
      weaponCategory: 'martial',
      dmg1: '1d10',
      dmgType: 'P',
      range: '150/600',
      property: ['A', '2H|XPHB'],
    })!;
    expect(bow.weapon).toMatchObject({ type: 'ranged', category: 'martial', hand: 'two' });
    expect(bow.weapon!.properties).toContainEqual({ key: 'range', normal: 150, long: 600 });
  });

  it('file multipli: riconosce le sezioni e collega i background ai talenti SRD', () => {
    const files = [
      { race: [race, { name: 'Copy', _copy: { name: 'Testfolk' } }] },
      { background: [{ ...background, feats: [{ 'alert|xphb': true }] }] },
      {
        spell: [
          {
            name: 'Test Bolt',
            level: 1,
            school: 'V',
            time: [{ number: 1, unit: 'action' }],
            range: { type: 'point', distance: { type: 'feet', amount: 60 } },
            components: { v: true },
            duration: [{ type: 'instant' }],
            entries: ['Zap.'],
          },
        ],
      },
      { nothing: [] },
    ];
    expect(files.map(isFiveEtoolsContent)).toEqual([true, true, true, false]);
    const b = convertFiveEtoolsFiles(files, SRD_FEATS);
    expect(b.species).toHaveLength(1);
    expect(b.skipped).toBe(1);
    expect(b.spells).toHaveLength(1);
    expect(b.backgrounds[0]).toMatchObject({ featId: 'srd-feat-alert', featName: 'Allerta' });

    const items = bundleToLibraryItems(b);
    for (const it of items) expect(libraryItemSchema.safeParse(it).success, it.id).toBe(true);
  });
  it('file delle classi degli incantesimi: entrambe le forme note', () => {
    const bolt = {
      name: 'Test Bolt',
      source: 'TST',
      level: 0,
      school: 'V',
      time: [{ number: 1, unit: 'action' }],
      range: { type: 'point', distance: { type: 'feet', amount: 120 } },
      components: { v: true },
      duration: [{ type: 'instant' }],
      entries: ['Zap.'],
    };
    const asObject = { TST: { 'Test Bolt': { class: { XPHB: { Sorcerer: true, Wizard: true } } } } };
    const asArray = { tst: { 'test bolt': { class: [{ name: 'Sorcerer', source: 'XPHB' }] } } };
    expect(isFiveEtoolsContent(asObject)).toBe(true);
    expect(convertFiveEtoolsFiles([{ spell: [bolt] }, asObject]).spells[0]!.classes).toEqual([
      'Stregone',
      'Mago',
    ]);
    expect(convertFiveEtoolsFiles([asArray, { spell: [bolt] }]).spells[0]!.classes).toEqual(['Stregone']);
  });
});
