import type { ID } from '@/domain/primitives';
import type { Spell } from '@/domain/spells';
import { normalizeKey } from '@/lib/normalizeKey';
import { db } from '../db';

/** Libreria incantesimi condivisa tra i personaggi. Import 5etools e filtri avanzati: step 8. */
export const spellsRepo = {
  get(id: ID): Promise<Spell | undefined> {
    return db.spells.get(id);
  },

  bulkGet(ids: ID[]): Promise<(Spell | undefined)[]> {
    return db.spells.bulkGet(ids);
  },

  list(): Promise<Spell[]> {
    return db.spells.orderBy('nameKey').toArray();
  },

  async save(spell: Spell): Promise<Spell> {
    const saved = { ...spell, nameKey: normalizeKey(spell.name), updatedAt: Date.now() };
    await db.spells.put(saved);
    return saved;
  },

  async bulkSave(spells: Spell[]): Promise<void> {
    const now = Date.now();
    await db.spells.bulkPut(spells.map((s) => ({ ...s, nameKey: normalizeKey(s.name), updatedAt: now })));
  },

  async remove(id: ID): Promise<void> {
    await db.spells.delete(id);
  },
};
