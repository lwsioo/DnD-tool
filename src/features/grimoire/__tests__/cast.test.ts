import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { buildExampleData } from '@/data/templates/example';
import type { Spell } from '@/domain/spells';
import { computeSlots } from '@/engine/spellSlots';
import { castOptions, castSpell } from '../castActions';
import { EMPTY_FILTERS, filterSpells } from '../filters';

const data = buildExampleData(0);
const byName = (n: string) => data.spells.find((s) => s.name === n)!;
const csOf = (spell: Spell) => data.character.spellcasting.spells.find((s) => s.spellId === spell.id)!;

describe('lancio', () => {
  it('opzioni: slot dal livello dell’incantesimo in su, con disponibilità', () => {
    const bless = byName('Benedizione');
    const opts = castOptions(bless, csOf(bless), computeSlots(data.character), 0);
    expect(opts).toEqual([
      { mode: { kind: 'slot', level: 1 }, label: 'Slot di 1° livello (2/3)', castLevel: 1, available: true },
    ]);
  });

  it('Patto, lancio gratuito e rituale', () => {
    const spell = { ...byName('Benedizione'), ritual: true, level: 1 as const };
    const c = produce(data.character, (d) => {
      d.classes.push({ id: 'w', classKey: 'warlock', name: 'Warlock', level: 3, hitDie: 8, caster: 'pact' });
      d.spellcasting.spells[0]!.freeUses = {
        max: '1',
        used: 0,
        recharge: { shortRest: 0, longRest: 'all' },
        pinned: true,
      };
    });
    const opts = castOptions(spell, c.spellcasting.spells[0]!, computeSlots(c), 1).map((o) => o.mode.kind);
    expect(opts).toEqual(['free', 'slot', 'pact', 'ritual']);
  });

  it('consuma lo slot e imposta la concentrazione', () => {
    const bless = byName('Benedizione');
    const after = produce(data.character, (d) =>
      castSpell(d, csOf(bless).id, { kind: 'slot', level: 1 }, true),
    );
    expect(after.spellcasting.slots.used[0]).toBe(2);
    expect(after.combat.concentration?.characterSpellId).toBe(csOf(bless).id);
  });

  it('rituale e trucchetto non consumano nulla', () => {
    const bless = byName('Benedizione');
    const after = produce(data.character, (d) => castSpell(d, csOf(bless).id, { kind: 'ritual' }, false));
    expect(after.spellcasting.slots).toEqual(data.character.spellcasting.slots);
  });
});

describe('filtri', () => {
  const entries = data.character.spellcasting.spells.map((cs) => ({
    cs,
    spell: data.spells.find((s) => s.id === cs.spellId)!,
  }));

  it.each([
    [{}, 5],
    [{ statuses: ['alwaysPrepared'] }, 2],
    [{ tags: ['C'] }, 3],
    [{ tags: ['M'] }, 3],
    [{ tags: ['C'], statuses: ['prepared'] }, 1],
    [{ text: 'cura' }, 1],
    [{ text: 'smite' }, 1],
    [{ levels: [0] }, 0],
  ] as const)('%j → %d', (f, n) => {
    expect(filterSpells(entries, { ...EMPTY_FILTERS, ...f } as typeof EMPTY_FILTERS)).toHaveLength(n);
  });
});
