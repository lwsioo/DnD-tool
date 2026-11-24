import { describe, expect, it } from 'vitest';
import { SRD_DERIVE_CONTEXT } from '@/data/srd';
import { deriveCharacter } from '@/engine/derive';
import {
  backgroundBonus,
  buildCharacterFromWizard,
  checkAbilities,
  initialDraft,
  pointBuySpent,
  remainingPool,
  roll4d6DropLowest,
  scoresForMethod,
  type WizardDraft,
} from '../logic';

const standardFighter = (): WizardDraft => ({
  ...initialDraft(),
  name: 'Brann',
  species: 'Nano',
  background: 'Soldato',
  classKey: 'fighter',
  scores: { str: 15, dex: 12, con: 14, int: 8, wis: 13, cha: 10 },
  bonusMode: 'twoOne',
  bonusAbilities: ['str', 'con'],
  skills: ['athletics', 'perception'],
  masteries: ['longsword', 'greataxe', 'handaxe'],
  armorId: 'chain-mail',
  shield: true,
  weaponIds: ['longsword'],
  gold: 10,
});

describe('metodi per le caratteristiche', () => {
  it('point buy: costi 2024', () => {
    expect(pointBuySpent(scoresForMethod('pointbuy'))).toBe(0);
    expect(pointBuySpent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 })).toBe(27);
    expect(
      checkAbilities({
        ...initialDraft(),
        method: 'pointbuy',
        scores: { str: 15, dex: 15, con: 15, int: 9, wis: 8, cha: 8 },
      }),
    ).toMatchObject({
      ok: false,
      message: 'Hai speso 28 punti su 27.',
    });
  });

  it('serie standard: ogni valore una volta', () => {
    const d = standardFighter();
    expect(checkAbilities(d)).toEqual({ ok: true });
    expect(checkAbilities({ ...d, scores: { ...d.scores, dex: 15 } }).ok).toBe(false);
    expect(
      remainingPool([15, 14, 13, 12, 10, 8], { str: 15, dex: 0, con: 14, int: 0, wis: 0, cha: 0 }),
    ).toEqual([13, 12, 10, 8]);
  });

  it('4d6 tenendo i tre più alti', () => {
    const seq = [0.99, 0, 0.5, 0.99]; // 6, 1, 4, 6 → 16
    let i = 0;
    const values = roll4d6DropLowest(() => seq[i++ % seq.length]!);
    expect(values).toHaveLength(6);
    expect(values[0]).toBe(16);
    for (const v of values) expect(v).toBeGreaterThanOrEqual(3);
  });

  it('bonus del background: +2/+1 o +1/+1/+1', () => {
    expect(backgroundBonus({ bonusMode: 'twoOne', bonusAbilities: ['dex', 'wis'] })).toMatchObject({
      dex: 2,
      wis: 1,
      str: 0,
    });
    expect(backgroundBonus({ bonusMode: 'threeOnes', bonusAbilities: ['str', 'con', 'cha'] })).toMatchObject({
      str: 1,
      con: 1,
      cha: 1,
    });
  });
});

describe('costruzione del personaggio', () => {
  it('Guerriero 1 con cotta di maglia e scudo: CA 18, PF 10 + COS', () => {
    const c = buildCharacterFromWizard(standardFighter());
    const d = deriveCharacter(c, SRD_DERIVE_CONTEXT);
    expect(c.identity).toMatchObject({ name: 'Brann', species: 'Nano', background: 'Soldato' });
    expect(d.abilities.str.score).toBe(17);
    expect(d.abilities.con.score).toBe(15);
    expect(d.ac.total).toBe(18);
    expect(d.hp.max.total).toBe(10 + 2);
    expect(d.saves.str.prof).toBe(1);
    expect(d.skills.athletics.total).toBe(3 + 2);
    expect(d.attacks[0]).toMatchObject({ name: 'Spada Lunga', masteryUnlocked: true, toHit: { total: 5 } });
    expect(d.warnings).toEqual([]);
    expect(c.inventory.currency.gp).toBe(10);
  });

  it('incantatore: la caratteristica scelta sostituisce quella predefinita; livello iniziale > 1', () => {
    const c = buildCharacterFromWizard({
      ...standardFighter(),
      classKey: 'cleric',
      level: 3,
      spellAbility: 'cha',
      armorId: '',
      shield: false,
      weaponIds: [],
    });
    expect(c.classes[0]).toMatchObject({ name: 'Chierico', level: 3, caster: 'full' });
    expect(c.spellcasting.sources).toMatchObject([{ label: 'Chierico', ability: 'cha' }]);
    expect(deriveCharacter(c).slots.standard[1]).toMatchObject({ max: 2 });
  });

  it('senza scelte produce comunque un personaggio valido', () => {
    const c = buildCharacterFromWizard(initialDraft());
    expect(c.identity.name).toBe('Nuovo personaggio');
    expect(() => deriveCharacter(c, SRD_DERIVE_CONTEXT)).not.toThrow();
  });
});
