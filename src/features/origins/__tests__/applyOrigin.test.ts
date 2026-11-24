import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { SRD_BACKGROUNDS, SRD_FEATS, SRD_SPECIES } from '@/data/srd/origins';
import { speciesDefSchema, backgroundDefSchema, featDefSchema } from '@/db/schemas';
import type { Character } from '@/domain/character';
import { createBlankCharacter } from '@/domain/factories';
import { applyBackground, applySpecies, sanitizeBonus } from '../applyOrigin';

const lib = { feats: SRD_FEATS };
const species = (name: string) => SRD_SPECIES.find((s) => s.name === name)!;
const background = (name: string) => SRD_BACKGROUNDS.find((s) => s.name === name)!;
const edit = (c: Character, fn: (d: Character) => void) => produce(c, fn);

describe('libreria SRD delle origini', () => {
  it('rispetta gli schemi di validazione', () => {
    for (const s of SRD_SPECIES) expect(speciesDefSchema.safeParse(s).success, s.name).toBe(true);
    for (const b of SRD_BACKGROUNDS) expect(backgroundDefSchema.safeParse(b).success, b.name).toBe(true);
    for (const f of SRD_FEATS) expect(featDefSchema.safeParse(f).success, f.name).toBe(true);
  });

  it('ogni background concede un talento presente in libreria', () => {
    for (const b of SRD_BACKGROUNDS)
      expect(
        SRD_FEATS.some((f) => f.id === b.featId),
        b.name,
      ).toBe(true);
  });
});

describe('applySpecies', () => {
  it('aggiunge tratti, velocità e taglia', () => {
    const c = edit(createBlankCharacter(), (d) =>
      applySpecies(d, species('Elfo'), { optionKey: 'wood', skills: ['perception'], spellAbility: 'wis' }),
    );
    expect(c.identity.species).toBe('Elfo');
    expect(c.combat.speed.walk).toBe(35);
    expect(c.skills.perception.prof).toBe(1);
    expect(c.features.map((f) => f.name)).toContain('Trance');
    expect(c.features.map((f) => f.name)).toContain('Lignaggio dell’Elfo dei Boschi');
    expect(c.spellcasting.sources).toHaveLength(1);
    expect(c.spellcasting.sources[0]!.ability).toBe('wis');
    expect(c.origin?.speciesOption).toBe('wood');
  });

  it('ignora le abilità fuori dalla lista consentita', () => {
    const c = edit(createBlankCharacter(), (d) => applySpecies(d, species('Elfo'), { skills: ['arcana'] }));
    expect(c.skills.arcana.prof).toBe(0);
  });

  it('cambiando specie toglie tutto ciò che la precedente aveva aggiunto', () => {
    let c = edit(createBlankCharacter(), (d) => {
      d.skills.stealth.prof = 1; // scelta manuale dell'utente
      applySpecies(
        d,
        species('Umano'),
        { skills: ['stealth', 'history'] as never, featId: 'srd-feat-alert' },
        lib,
      );
    });
    expect(c.skills.history.prof).toBe(0); // Umano: una sola abilità (la prima, già competente → nessun cambio)
    expect(c.settings.heroicInspirationOnLongRest).toBe(true);
    expect(c.features.some((f) => f.name === 'Allerta')).toBe(true);

    c = edit(c, (d) => applySpecies(d, species('Nano'), {}, lib));
    expect(c.skills.stealth.prof).toBe(1); // l'utente l'aveva già: resta
    expect(c.settings.heroicInspirationOnLongRest).toBe(false);
    expect(c.features.some((f) => f.name === 'Allerta')).toBe(false);
    expect(c.features.some((f) => f.name === 'Robustezza Nanica')).toBe(true);
    expect(c.features.find((f) => f.name === 'Robustezza Nanica')!.effects[0]).toMatchObject({
      target: 'hp.max',
      op: 'add',
      value: 'lvl',
    });
  });

  it('rimuovendo la specie lascia intatti i privilegi manuali', () => {
    let c = edit(createBlankCharacter(), (d) => {
      d.features.push({
        id: 'mio',
        category: 'other',
        name: 'Mio',
        description: '',
        effects: [],
        toggleable: false,
        active: true,
      });
      applySpecies(d, species('Orco'));
    });
    c = edit(c, (d) => applySpecies(d, null));
    expect(c.features.map((f) => f.id)).toEqual(['mio']);
  });

  it('i tratti con usi diventano contatori', () => {
    const c = edit(createBlankCharacter(), (d) =>
      applySpecies(d, species('Dragonide'), { optionKey: 'red' }),
    );
    const breath = c.features.find((f) => f.name === 'Soffio')!;
    expect(breath.uses).toMatchObject({ max: 'pb', used: 0, recharge: { longRest: 'all' } });
    expect(c.features.some((f) => f.name.includes('fuoco'))).toBe(true);
  });
});

describe('applyBackground', () => {
  it('applica bonus, abilità, strumenti, talento ed equipaggiamento A', () => {
    const c = edit(createBlankCharacter(), (d) =>
      applyBackground(d, background('Soldato'), { abilityBonus: { str: 2, con: 1 }, equipment: 'A' }, lib),
    );
    expect(c.abilities.str.bonus).toBe(2);
    expect(c.abilities.con.bonus).toBe(1);
    expect(c.skills.athletics.prof).toBe(1);
    expect(c.proficiencies.tools).toContain('Set da gioco');
    expect(c.features.some((f) => f.name === 'Attaccante Selvaggio')).toBe(true);
    expect(c.inventory.items.some((i) => i.kind === 'weapon' && i.name)).toBe(true);
    expect(c.inventory.currency.gp).toBe(14);
  });

  it('Iniziato alla Magia crea una fonte da incantatore con la lista del background', () => {
    const c = edit(createBlankCharacter(), (d) =>
      applyBackground(
        d,
        background('Accolito'),
        { abilityBonus: { wis: 2, cha: 1 }, feat: { spellAbility: 'wis' } },
        lib,
      ),
    );
    expect(c.features.some((f) => f.name === 'Iniziato alla Magia (Chierico)')).toBe(true);
    expect(c.spellcasting.sources[0]).toMatchObject({
      label: 'Iniziato alla Magia (Chierico)',
      ability: 'wis',
    });
  });

  it('cambiando background toglie bonus, fonti e incantesimi collegati', () => {
    let c = edit(createBlankCharacter(), (d) =>
      applyBackground(d, background('Saggio'), { abilityBonus: { int: 1, wis: 1, con: 1 } }, lib),
    );
    const sourceId = c.spellcasting.sources[0]!.id;
    c = edit(c, (d) => {
      d.spellcasting.spells.push({ id: 'x', spellId: 's', sourceId, status: 'known' });
      applyBackground(d, background('Criminale'), { abilityBonus: { dex: 2, int: 1 } }, lib);
    });
    expect(c.abilities.wis.bonus).toBe(0);
    expect(c.abilities.int.bonus).toBe(1);
    expect(c.abilities.dex.bonus).toBe(2);
    expect(c.spellcasting.sources).toHaveLength(0);
    expect(c.spellcasting.spells).toHaveLength(0);
    expect(c.skills.arcana.prof).toBe(0);
    expect(c.skills.stealth.prof).toBe(1);
  });

  it('scarta bonus non validi', () => {
    const def = background('Soldato');
    expect(sanitizeBonus(def, { str: 2, int: 1 })).toEqual({});
    expect(sanitizeBonus(def, { str: 2, dex: 2 })).toEqual({});
    expect(sanitizeBonus(def, { str: 1, dex: 1, con: 1 })).toEqual({ str: 1, dex: 1, con: 1 });
  });
});
