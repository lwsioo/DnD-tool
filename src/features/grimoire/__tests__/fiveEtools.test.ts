import { describe, expect, it } from 'vitest';
import {
  convertFiveEtoolsFile,
  convertFiveEtoolsSpell,
  convertTags,
  entriesToMarkdown,
  isFiveEtoolsFile,
} from '../import/fiveEtools';

/** Voce costruita sul formato pubblico di 5etools (contenuto fittizio). */
const blast = {
  name: 'Test Blast',
  source: 'HB',
  level: 3,
  school: 'V',
  time: [{ number: 1, unit: 'action' }],
  range: { type: 'point', distance: { type: 'feet', amount: 150 } },
  components: { v: true, s: true, m: { text: 'a pinch of {@i sulfur}', cost: 2500, consume: true } },
  duration: [{ type: 'instant' }],
  entries: [
    'Each creature in a 20-foot sphere makes a {@dc 15} Dexterity saving throw, taking {@damage 8d6} fire damage on a failure and falling {@condition prone}.',
    { type: 'list', items: ['First {@b bold}', 'Second'] },
    { type: 'entries', name: 'Aftermath', entries: ['Flames linger.'] },
  ],
  entriesHigherLevel: [
    {
      type: 'entries',
      name: 'Using a Higher-Level Spell Slot',
      entries: ['The damage increases by {@scaledamage 8d6|3-9|1d6} for each slot level above 3.'],
    },
  ],
  savingThrow: ['dexterity'],
  damageInflict: ['fire'],
  classes: {
    fromClassList: [
      { name: 'Wizard', source: 'PHB' },
      { name: 'Sorcerer', source: 'PHB' },
    ],
  },
};

const cantrip = {
  name: 'Test Bolt',
  source: 'HB',
  level: 0,
  school: 'V',
  time: [{ number: 1, unit: 'action' }],
  range: { type: 'point', distance: { type: 'feet', amount: 120 } },
  components: { v: true, s: true },
  duration: [{ type: 'instant' }],
  entries: ['You hurl a mote of fire.'],
  scalingLevelDice: { label: 'fire damage', scaling: { 1: '1d10', 5: '2d10', 11: '3d10', 17: '4d10' } },
  spellAttack: ['R'],
};

const aura = {
  name: 'Test Aura',
  level: 1,
  school: 'A',
  time: [{ number: 1, unit: 'bonus' }],
  range: { type: 'emanation', distance: { type: 'feet', amount: 10 } },
  components: { v: true },
  duration: [{ type: 'timed', duration: { type: 'minute', amount: 10 }, concentration: true }],
  meta: { ritual: true },
  entries: ['A shimmering field.'],
};

describe('tag 5etools', () => {
  it.each([
    ['{@b grassetto}', '**grassetto**'],
    ['{@i corsivo}', '*corsivo*'],
    ['{@dc 15}', 'CD 15'],
    ['{@hit 7}', '+7'],
    ['{@damage 2d6}', '2d6'],
    ['{@condition prone}', '[prone](cond:prone)'],
    ['{@condition Frightened|XPHB}', '[Frightened](cond:frightened)'],
    ['{@spell fireball|PHB|palla di fuoco}', 'palla di fuoco'],
    ['{@creature goblin}', 'goblin'],
    ['{@scaledamage 8d6|3-9|1d6}', '1d6'],
    ['{@b {@i annidato}}', '***annidato***'],
  ])('%s → %s', (input, output) => expect(convertTags(input)).toBe(output));

  it('voci strutturate: liste e sottosezioni', () => {
    expect(entriesToMarkdown(blast.entries)).toContain('- First **bold**\n- Second');
    expect(entriesToMarkdown(blast.entries)).toContain('**Aftermath.** Flames linger.');
  });
});

describe('conversione incantesimi', () => {
  it('livello, scuola, tempi, gittata, componenti, durata, TS, danni, classi', () => {
    const s = convertFiveEtoolsSpell(blast)!;
    expect(s).toMatchObject({
      name: 'Test Blast',
      nameEn: 'Test Blast',
      origin: 'import',
      sourceBook: 'HB',
      level: 3,
      school: 'evocation',
      castingTime: { amount: 1, unit: 'action' },
      range: { kind: 'distance', distance: 150 },
      components: { v: true, s: true, m: true, material: 'a pinch of *sulfur*', costGp: 25, consumed: true },
      duration: { kind: 'instant', concentration: false },
      save: 'dex',
      damageTypes: ['fire'],
      classes: ['Mago', 'Stregone'],
      scaling: { perSlot: '1d6' },
    });
    expect(s.description).toContain('CD 15');
    expect(s.description).toContain('[prone](cond:prone)');
    expect(s.higherLevels).toBe('The damage increases by 1d6 for each slot level above 3.');
  });

  it('trucchetto con scaling e attacco a distanza', () => {
    expect(convertFiveEtoolsSpell(cantrip)).toMatchObject({
      level: 0,
      attack: 'ranged',
      scaling: { cantrip: ['1d10', '2d10', '3d10', '4d10'] },
    });
  });

  it('emanazione, concentrazione, rituale, azione bonus', () => {
    expect(convertFiveEtoolsSpell(aura)).toMatchObject({
      castingTime: { unit: 'bonus' },
      range: { kind: 'self', area: { shape: 'emanation', size: 10 } },
      duration: { kind: 'timed', amount: 10, unit: 'minute', concentration: true },
      ritual: true,
      school: 'abjuration',
    });
  });

  it('file intero: riconoscimento e avvisi per voci non valide', () => {
    const file = { spell: [blast, cantrip, { name: 'Senza livello' }] };
    expect(isFiveEtoolsFile(file)).toBe(true);
    expect(isFiveEtoolsFile({ hello: 1 })).toBe(false);
    const r = convertFiveEtoolsFile(file);
    expect(r.spells.map((s) => s.name)).toEqual(['Test Blast', 'Test Bolt']);
    expect(r.warnings).toHaveLength(1);
  });
});
