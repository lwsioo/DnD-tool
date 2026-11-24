import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { deriveCharacter } from '../derive';
import { abilityMod } from '../abilities';
import { proficiencyBonus } from '../proficiency';
import { armorItem, cls, feature, makeCharacter } from './fixtures';

describe('modificatori e competenza', () => {
  it.each([
    [1, -5],
    [3, -4],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [15, 2],
    [20, 5],
    [30, 10],
  ])('punteggio %d → mod %d', (score, mod) => expect(abilityMod(score)).toBe(mod));

  it.each([
    [0, 2],
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ])('livello %d → bonus competenza +%d', (level, pb) => expect(proficiencyBonus(level)).toBe(pb));

  it('il bonus competenza usa il livello totale del multiclasse', () => {
    const c = makeCharacter((d) => {
      d.classes = [cls('fighter', 3, 10), cls('wizard', 2, 6)];
    });
    expect(deriveCharacter(c).pb).toBe(3);
  });
});

describe('punteggi di caratteristica', () => {
  it('somma base, incrementi ed effetti; "set" è un minimo; tetto 30', () => {
    const c = makeCharacter((d) => {
      d.abilities.str = { base: 15, bonus: 2 };
      d.abilities.con = { base: 12, bonus: 0 };
      d.abilities.cha = { base: 20, bonus: 0 };
      d.features = [
        feature('Guanti della Potenza dell’Orco', [{ target: 'score.con', op: 'set', value: '19' }]),
        feature('Cintura', [{ target: 'score.str', op: 'set', value: '15' }]),
        feature('Benedizione divina', [{ target: 'score.cha', op: 'add', value: '12' }]),
      ];
    });
    const d = deriveCharacter(c);
    expect(d.abilities.str).toMatchObject({ score: 17, mod: 3 });
    expect(d.abilities.con).toMatchObject({ score: 19, mod: 4 });
    expect(d.abilities.cha).toMatchObject({ score: 30, mod: 10 });
  });
});

describe('tiri salvezza e abilità', () => {
  const base = makeCharacter((d) => {
    d.classes = [cls('rogue', 5, 8)]; // PB +3
    d.abilities.dex = { base: 16, bonus: 0 }; // +3
    d.abilities.int = { base: 14, bonus: 0 }; // +2
    d.abilities.wis = { base: 12, bonus: 0 }; // +1
    d.saves.dex = 1;
    d.skills.stealth = { prof: 2 };
    d.skills.investigation = { prof: 1 };
    d.skills.history = { prof: 0.5 };
  });

  it('competenza, maestria e metà competenza (arrotondata per difetto)', () => {
    const d = deriveCharacter(base);
    expect(d.saves.dex.total).toBe(6);
    expect(d.saves.str.total).toBe(0);
    expect(d.skills.stealth.total).toBe(9);
    expect(d.skills.investigation.total).toBe(5);
    expect(d.skills.history.total).toBe(3); // 2 + floor(1.5)
    expect(d.skills.history.parts.map((p) => p.label)).toEqual(['Mod. INT', 'Metà competenza']);
  });

  it('percezione passiva = 10 + Percezione (±5 con vantaggio/svantaggio)', () => {
    expect(deriveCharacter(base).passive.perception.total).toBe(11);
    const keen = produce(base, (d) => {
      d.features = [feature('Sensi acuti', [{ target: 'skill.perception', op: 'advantage' }])];
    });
    expect(deriveCharacter(keen).passive.perception.total).toBe(16);
  });

  it('effetti di competenza/maestria alzano il livello, mai lo abbassano', () => {
    const c = produce(base, (d) => {
      d.features = [
        feature('Esperto', [
          { target: 'skill.investigation', op: 'expertise' },
          { target: 'skill.stealth', op: 'proficiency' },
          { target: 'save.wis', op: 'proficiency' },
        ]),
      ];
    });
    const d = deriveCharacter(c);
    expect(d.skills.investigation).toMatchObject({ prof: 2, total: 8 });
    expect(d.skills.stealth).toMatchObject({ prof: 2, total: 9 });
    expect(d.saves.wis).toMatchObject({ prof: 1, total: 4 });
  });

  it('armatura con svantaggio a Furtività mostra la fonte', () => {
    const c = produce(base, (d) => {
      d.proficiencies.armor = ['light', 'medium', 'heavy'];
      d.inventory.items = [
        armorItem('Corazza a piastre', { category: 'heavy', baseAc: 18, stealthDisadvantage: true }),
      ];
    });
    const d = deriveCharacter(c);
    expect(d.skills.stealth).toMatchObject({ mode: 'disadvantage', disadvantage: ['Corazza a piastre'] });
    expect(d.skills.acrobatics.mode).toBe('normal');
  });

  it('armatura non equipaggiata non dà svantaggio', () => {
    const c = makeCharacter((d) => {
      d.inventory.items = [
        armorItem('Corazza', { category: 'heavy', baseAc: 18, stealthDisadvantage: true }, false),
      ];
    });
    expect(deriveCharacter(c).skills.stealth.mode).toBe('normal');
  });

  it('vantaggio e svantaggio insieme si annullano', () => {
    const c = makeCharacter((d) => {
      d.proficiencies.armor = ['heavy'];
      d.inventory.items = [
        armorItem('Corazza', { category: 'heavy', baseAc: 18, stealthDisadvantage: true }),
      ];
      d.features = [feature('Mantello elfico', [{ target: 'skill.stealth', op: 'advantage' }])];
    });
    expect(deriveCharacter(c).skills.stealth.mode).toBe('cancelled');
  });

  it('armatura senza addestramento: svantaggio a FOR/DES e niente incantesimi', () => {
    const c = makeCharacter((d) => {
      d.inventory.items = [armorItem('Cotta di maglia', { category: 'heavy', baseAc: 16 })];
    });
    const d = deriveCharacter(c);
    expect(d.saves.dex.mode).toBe('disadvantage');
    expect(d.skills.athletics.mode).toBe('disadvantage');
    expect(d.skills.arcana.mode).toBe('normal');
    expect(d.cannotCastSpells).toBe(true);
    expect(d.warnings.join()).toContain('senza addestramento');
  });

  it('Indebolimento: −2 per livello ai tiri d20, −5 ft per livello', () => {
    const c = makeCharacter((d) => {
      d.combat.exhaustion = 2;
      d.abilities.dex = { base: 14, bonus: 0 };
    });
    const d = deriveCharacter(c);
    expect(d.saves.dex.total).toBe(-2);
    expect(d.initiative.total).toBe(-2);
    expect(d.speed.walk.total).toBe(20);
  });

  it('privilegi attivabili contano solo se attivi; condizioni dal contesto', () => {
    const rage = feature('Ira', [{ target: 'check.str', op: 'advantage' }], {
      toggleable: true,
      active: false,
    });
    const off = makeCharacter((d) => {
      d.features = [rage];
    });
    expect(deriveCharacter(off).skills.athletics.mode).toBe('normal');
    const on = makeCharacter((d) => {
      d.features = [{ ...rage, active: true }];
      d.combat.conditions = ['poisoned'];
    });
    const d = deriveCharacter(on, {
      conditionEffects: { poisoned: [{ id: 'p', target: 'check.str', op: 'disadvantage' }] },
      conditionNames: { poisoned: 'Avvelenato' },
    });
    expect(d.skills.athletics).toMatchObject({ mode: 'cancelled', disadvantage: ['Avvelenato'] });
  });

  it('iniziativa: DES + bonus (Allerta = +pb)', () => {
    const c = makeCharacter((d) => {
      d.classes = [cls('fighter', 5, 10)];
      d.abilities.dex = { base: 14, bonus: 0 };
      d.features = [
        feature('Allerta', [{ target: 'initiative', op: 'add', value: 'pb' }], { category: 'feat' }),
      ];
    });
    expect(deriveCharacter(c).initiative.total).toBe(5);
  });
});
