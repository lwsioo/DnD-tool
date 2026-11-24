import type { CharacterSpell, CharacterSpellStatus } from '@/domain/character';
import type { Spell } from '@/domain/spells';
import { normalizeKey } from '@/lib/normalizeKey';

export interface SpellFilters {
  levels: number[];
  statuses: CharacterSpellStatus[];
  /** C = concentrazione, R = rituale, M = componente materiale. */
  tags: Array<'C' | 'R' | 'M'>;
  text: string;
}

export const EMPTY_FILTERS: SpellFilters = { levels: [], statuses: [], tags: [], text: '' };

export interface SpellEntry {
  cs: CharacterSpell;
  spell: Spell;
}

/** Filtri combinabili: OR dentro lo stesso gruppo, AND tra gruppi. */
export function filterSpells(entries: SpellEntry[], f: SpellFilters): SpellEntry[] {
  const q = normalizeKey(f.text);
  return entries.filter(({ cs, spell }) => {
    if (f.levels.length && !f.levels.includes(spell.level)) return false;
    if (f.statuses.length && !f.statuses.includes(cs.status)) return false;
    if (f.tags.length) {
      const has = {
        C: spell.duration.concentration,
        R: spell.ritual,
        M: spell.components.m,
      };
      if (!f.tags.some((t) => has[t])) return false;
    }
    if (q && !spell.nameKey.includes(q) && !normalizeKey(spell.nameEn ?? '').includes(q)) return false;
    return true;
  });
}

/** Ordinamento per livello e poi per nome. */
export const bySpellLevelThenName = (a: SpellEntry, b: SpellEntry) =>
  a.spell.level - b.spell.level || a.spell.name.localeCompare(b.spell.name, 'it');
