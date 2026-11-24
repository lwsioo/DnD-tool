import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import {
  ARMOR,
  CLASSES,
  CONDITION_KEYS,
  CONDITIONS,
  SRD_DERIVE_CONTEXT,
  WEAPON_MASTERIES,
  WEAPON_PROPERTIES,
  WEAPONS,
  weaponDataFromBase,
  WEAPONS_BY_ID,
} from '..';
import { createBlankCharacter } from '@/domain/factories';
import { deriveCharacter } from '@/engine/derive';
import { parseRuleHref } from '@/features/inspector/refs';
import { FULL_CASTER_SLOTS, PACT_MAGIC } from '../slotTables';

describe('libreria SRD — integrità dei dati', () => {
  it('38 armi con id unici, maestrie e proprietà esistenti', () => {
    expect(WEAPONS).toHaveLength(38);
    expect(new Set(WEAPONS.map((w) => w.id)).size).toBe(WEAPONS.length);
    for (const w of WEAPONS) {
      expect(WEAPON_MASTERIES[w.mastery], w.id).toBeDefined();
      for (const p of w.properties) {
        expect(WEAPON_PROPERTIES[p.key], `${w.id}:${p.key}`).toBeDefined();
        if ('normal' in p) expect(p.normal, w.id).toBeLessThan(p.long);
      }
    }
  });

  it('Versatile ⇔ dado a due mani; Munizioni ⇔ Gittata e tipo di munizione', () => {
    for (const w of WEAPONS) {
      const has = (k: string) => w.properties.some((p) => p.key === k);
      expect(has('versatile'), w.id).toBe(!!w.versatileDice);
      expect(has('ammunition'), w.id).toBe(has('range'));
      expect(has('ammunition'), w.id).toBe(!!w.ammunition);
      expect(w.type === 'ranged', w.id).toBe(has('range') || w.id === 'dart');
    }
  });

  it('ogni maestria è usata da almeno un’arma', () => {
    for (const k of Object.keys(WEAPON_MASTERIES)) {
      expect(
        WEAPONS.some((w) => w.mastery === k),
        k,
      ).toBe(true);
    }
  });

  it('armature: limite di DES coerente con la categoria', () => {
    for (const a of ARMOR) {
      if (a.category === 'light') expect(a.dexCap, a.id).toBeNull();
      if (a.category === 'medium') expect(a.dexCap, a.id).toBe(2);
      if (a.category === 'heavy') expect(a.dexCap, a.id).toBe(0);
    }
    expect(ARMOR.filter((a) => a.category === 'shield')).toHaveLength(1);
  });

  it('12 classi, una sola con Magia del Patto', () => {
    expect(CLASSES).toHaveLength(12);
    expect(CLASSES.filter((c) => c.caster === 'pact').map((c) => c.key)).toEqual(['warlock']);
    for (const c of CLASSES) {
      if (c.caster !== 'none') expect(c.spellcastingAbility, c.key).toBeDefined();
    }
  });

  it('tabelle slot complete', () => {
    expect(FULL_CASTER_SLOTS).toHaveLength(20);
    expect(PACT_MAGIC).toHaveLength(20);
  });

  it('15 condizioni; i link interni nei testi puntano a voci esistenti', () => {
    expect(CONDITION_KEYS).toHaveLength(15);
    const bodies = [
      ...Object.values(CONDITIONS),
      ...Object.values(WEAPON_PROPERTIES),
      ...Object.values(WEAPON_MASTERIES),
    ].map((e) => e.body);
    for (const body of bodies) {
      for (const [, href] of body.matchAll(/\]\(([^)]+)\)/g)) {
        expect(parseRuleHref(href), href).not.toBeNull();
      }
    }
  });

  it('weaponDataFromBase: le armi a due mani partono impugnate a due mani', () => {
    expect(weaponDataFromBase(WEAPONS_BY_ID.get('greatsword')!).hand).toBe('two');
    expect(weaponDataFromBase(WEAPONS_BY_ID.get('longsword')!)).toMatchObject({
      hand: 'main',
      mastery: 'sap',
      versatileDice: '1d10',
    });
  });
});

describe('condizioni nel motore', () => {
  const withConditions = (...keys: string[]) =>
    produce(createBlankCharacter('Test', 0), (d) => {
      d.combat.conditions = keys;
    });

  it('tutte le condizioni insieme non rompono il calcolo', () => {
    expect(() => deriveCharacter(withConditions(...CONDITION_KEYS), SRD_DERIVE_CONTEXT)).not.toThrow();
  });

  it('Avvelenato: svantaggio a prove e attacchi, non ai TS', () => {
    const d = deriveCharacter(withConditions('poisoned'), SRD_DERIVE_CONTEXT);
    expect(d.skills.perception).toMatchObject({ mode: 'disadvantage', disadvantage: ['Avvelenato'] });
    expect(d.saves.con.mode).toBe('normal');
  });

  it('Privo di Sensi: velocità 0 e svantaggio all’iniziativa', () => {
    const d = deriveCharacter(withConditions('unconscious'), SRD_DERIVE_CONTEXT);
    expect(d.speed.walk.total).toBe(0);
    expect(d.initiative.mode).toBe('disadvantage');
  });

  it('Invisibile: vantaggio all’iniziativa', () => {
    expect(deriveCharacter(withConditions('invisible'), SRD_DERIVE_CONTEXT).initiative.mode).toBe(
      'advantage',
    );
  });

  it('Trattenuto: svantaggio ai TS su DES', () => {
    expect(deriveCharacter(withConditions('restrained'), SRD_DERIVE_CONTEXT).saves.dex.mode).toBe(
      'disadvantage',
    );
  });
});
