import { describe, expect, it } from 'vitest';
import { deriveCharacter } from '../derive';
import { applyDamage, applyHealing, applyTempHp, concentrationDC, type HpState } from '../hp';
import { longRest, rechargeUses, shortRest } from '../rests';
import type { Character } from '@/domain/character';
import { cls, feature, makeCharacter } from './fixtures';

describe('PF massimi', () => {
  it('automatici: dado pieno al 1°, media fissa poi, + COS per livello', () => {
    const c = makeCharacter((d) => {
      d.classes = [cls('fighter', 3, 10), cls('wizard', 2, 6)];
      d.abilities.con = { base: 14, bonus: 0 };
      d.combat.hp.maxMode = 'auto';
    });
    // 10 + 6 + 6 (guerriero) + 4 + 4 (mago) + 2 × 5
    expect(deriveCharacter(c).hp.max.total).toBe(40);
  });

  it('usa i tiri registrati e gli effetti (Robusto = 2 × livello)', () => {
    const c = makeCharacter((d) => {
      d.classes = [{ ...cls('fighter', 3, 10), hpRolls: [9, 2] }];
      d.combat.hp.maxMode = 'auto';
      d.features = [
        feature('Robusto', [{ target: 'hp.max', op: 'add', value: '2 * lvl' }], { category: 'feat' }),
      ];
    });
    expect(deriveCharacter(c).hp.max.total).toBe(10 + 9 + 2 + 6);
  });

  it('minimo 1 PF per livello con COS molto bassa', () => {
    const c = makeCharacter((d) => {
      d.classes = [cls('wizard', 2, 6)];
      d.abilities.con = { base: 1, bonus: 0 }; // −5
      d.combat.hp.maxMode = 'auto';
    });
    expect(deriveCharacter(c).hp.max.total).toBe(2);
  });

  it('manuale: il valore inserito', () => {
    const c = makeCharacter((d) => {
      d.combat.hp = { current: 5, temp: 0, maxMode: 'manual', maxManual: 33 };
    });
    expect(deriveCharacter(c).hp.max.total).toBe(33);
  });
});

describe('danni, cure, PF temporanei', () => {
  const s = (current: number, temp = 0, failures = 0): HpState => ({
    current,
    temp,
    deathSaves: { successes: 0, failures },
  });

  it('i PF temporanei assorbono per primi', () => {
    const r = applyDamage(s(20, 5), 8, 30);
    expect(r.state).toMatchObject({ current: 17, temp: 0 });
    expect(r.absorbedByTemp).toBe(5);
  });

  it('a 0 PF: caduta, e morte istantanea se il danno residuo ≥ PF massimi', () => {
    expect(applyDamage(s(10), 15, 30)).toMatchObject({ droppedToZero: true, instantDeath: false });
    expect(applyDamage(s(10), 40, 30)).toMatchObject({ droppedToZero: true, instantDeath: true });
  });

  it('danno a 0 PF: un fallimento (due se critico)', () => {
    expect(applyDamage(s(0), 3, 30).state.deathSaves.failures).toBe(1);
    expect(applyDamage(s(0, 0, 2), 3, 30, { critical: true }).state.deathSaves.failures).toBe(3);
  });

  it('concentrazione: CD max(10, metà danno), tetto 30', () => {
    expect(concentrationDC(7)).toBe(10);
    expect(concentrationDC(25)).toBe(12);
    expect(concentrationDC(100)).toBe(30);
    expect(applyDamage(s(30), 22, 30, { concentrating: true }).concentrationDC).toBe(11);
    expect(applyDamage(s(30), 22, 30).concentrationDC).toBeUndefined();
  });

  it('cura fino al massimo e azzera i TS contro morte', () => {
    expect(applyHealing(s(25), 10, 30).current).toBe(30);
    expect(applyHealing(s(0, 0, 2), 4, 30)).toMatchObject({ current: 4, deathSaves: { failures: 0 } });
  });

  it('PF temporanei: si tiene il valore più alto', () => {
    expect(applyTempHp(s(10, 8), 5).temp).toBe(8);
    expect(applyTempHp(s(10, 3), 5).temp).toBe(5);
  });
});

describe('riposi', () => {
  it.each([
    [{ shortRest: 'all', longRest: 'all' } as const, 'short', 3, 0],
    [{ shortRest: 1, longRest: 'all' } as const, 'short', 2, 1],
    [{ shortRest: 0, longRest: 'all' } as const, 'short', 2, 2],
    [{ shortRest: 0, longRest: 'all' } as const, 'long', 2, 0],
    [{ shortRest: 0, longRest: 1 } as const, 'long', 0, 0],
  ])('ricarica %j su riposo %s: %d → %d', (recharge, rest, used, expected) => {
    expect(rechargeUses(used, recharge, rest as 'short' | 'long')).toBe(expected);
  });

  /** Chierico 4 / Warlock 2, COS +2, risorse spese, slot usati. */
  const tired = (): Character =>
    makeCharacter((d) => {
      d.classes = [cls('cleric', 4, 8, 'full'), cls('warlock', 2, 8, 'pact')];
      d.abilities.con = { base: 14, bonus: 0 };
      d.combat.hp = { current: 10, temp: 4, maxMode: 'manual', maxManual: 45 };
      d.combat.hitDice = { 8: { spent: 4 } };
      d.combat.exhaustion = 2;
      d.combat.deathSaves = { successes: 1, failures: 2 };
      d.combat.concentration = { characterSpellId: 'x', since: 0 };
      d.spellcasting.slots.used = [3, 2, 0, 0, 0, 0, 0, 0, 0];
      d.spellcasting.pact = { used: 2 };
      d.spellcasting.spells = [
        {
          id: 'mv',
          spellId: 'misty-step',
          sourceId: 's',
          status: 'free',
          freeUses: { max: '1', used: 1, recharge: { shortRest: 0, longRest: 'all' }, pinned: true },
        },
      ];
      d.features = [
        feature('Incanalare Divinità', [], {
          uses: { max: '2', used: 2, recharge: { shortRest: 1, longRest: 'all' }, pinned: true },
        }),
        feature('Fortuna', [], {
          uses: { max: '3', used: 3, recharge: { shortRest: 0, longRest: 'all' }, pinned: false },
        }),
      ];
    });

  it('riposo breve: dadi vita + COS, risorse "breve" e slot del Patto', () => {
    const c = tired();
    const { character, summary } = shortRest(
      c,
      { maxHp: 45, conMod: 2 },
      {
        hitDice: [
          { die: 8, roll: 5 },
          { die: 8, roll: 1 },
          { die: 8, roll: 8 }, // ne restano solo 2 da spendere (6 totali, 4 spesi)
        ],
      },
    );
    expect(summary).toMatchObject({ hitDiceSpent: 2, hpRecovered: 10, pactSlotsRecovered: 2 });
    expect(summary.recharged).toEqual(['Incanalare Divinità']);
    expect(character.combat.hp.current).toBe(20);
    expect(character.combat.hitDice[8]?.spent).toBe(6);
    expect(character.features[0]!.uses!.used).toBe(1);
    expect(character.features[1]!.uses!.used).toBe(3);
    expect(character.spellcasting.slots.used[0]).toBe(3);
    expect(character.spellcasting.pact?.used).toBe(0);
    expect(c.combat.hp.current).toBe(10); // l'originale non è mutato
  });

  it('riposo lungo: tutto ricaricato secondo le regole 2024', () => {
    const { character, summary } = longRest(
      {
        ...tired(),
        settings: { heroicInspirationOnLongRest: true, clearTempHpOnLongRest: true, encumbranceRule: 'off' },
      },
      { maxHp: 45 },
      new Map([['misty-step', 'Passo Velato']]),
    );
    expect(character.combat.hp).toMatchObject({ current: 45, temp: 0 });
    expect(character.combat.hitDice).toEqual({});
    expect(character.combat.exhaustion).toBe(1);
    expect(character.combat.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(character.combat.concentration).toBeUndefined();
    expect(character.combat.heroicInspiration).toBe(true);
    expect(character.spellcasting.slots.used).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(character.features.map((f) => f.uses?.used)).toEqual([0, 0]);
    expect(summary).toMatchObject({
      hpRecovered: 35,
      hitDiceRecovered: 4,
      slotsRecovered: 5,
      exhaustionReduced: true,
    });
    expect(summary.recharged).toEqual(['Incanalare Divinità', 'Fortuna', 'Passo Velato']);
  });

  it('riposo lungo rispetta le impostazioni su PF temporanei e Ispirazione', () => {
    const c = makeCharacter((d) => {
      d.combat.hp = { current: 1, temp: 7, maxMode: 'manual', maxManual: 10 };
      d.settings.clearTempHpOnLongRest = false;
    });
    const { character } = longRest(c, { maxHp: 10 });
    expect(character.combat.hp.temp).toBe(7);
    expect(character.combat.heroicInspiration).toBe(false);
  });
});
