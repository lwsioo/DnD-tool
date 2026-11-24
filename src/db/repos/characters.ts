import { produce, type Draft } from 'immer';
import type { Character } from '@/domain/character';
import { createBlankCharacter } from '@/domain/factories';
import type { ID } from '@/domain/primitives';
import { db } from '../db';
import { linksForCharacter, reindexSource } from '../linkIndexer';

export type CharacterRecipe = (draft: Draft<Character>) => void;

/** Scrive il personaggio aggiornato e, se note o campagna sono cambiate, ne riallinea i [[collegamenti]]. */
async function writeNext(current: Character, next: Character): Promise<Character> {
  if (next === current) return current;
  const saved = { ...next, id: current.id, updatedAt: Date.now() };
  await db.characters.put(saved);
  if (saved.notes !== current.notes || saved.campaignId !== current.campaignId) {
    await reindexSource(saved.id, linksForCharacter(saved));
  }
  return saved;
}

export const charactersRepo = {
  /** Tutti i personaggi, dal più recente. */
  list(): Promise<Character[]> {
    return db.characters.orderBy('updatedAt').reverse().toArray();
  },

  get(id: ID): Promise<Character | undefined> {
    return db.characters.get(id);
  },

  async create(name?: string): Promise<Character> {
    const character = createBlankCharacter(name);
    await db.characters.add(character);
    return character;
  },

  async put(character: Character): Promise<void> {
    await db.transaction('rw', db.characters, db.wikiLinks, async () => {
      await db.characters.put(character);
      await reindexSource(character.id, linksForCharacter(character));
    });
  },

  /**
   * Lettura-modifica-scrittura atomica: la ricetta immer riceve lo stato più recente nel DB,
   * quindi modifiche ravvicinate (es. due click su un contatore) non si sovrascrivono a vicenda.
   * Ritorna il documento aggiornato, o undefined se il personaggio non esiste.
   */
  async mutate(id: ID, recipe: CharacterRecipe): Promise<Character | undefined> {
    return db.transaction('rw', db.characters, db.wikiLinks, async () => {
      const current = await db.characters.get(id);
      if (!current) return undefined;
      return writeNext(current, produce(current, recipe));
    });
  },

  /**
   * Come mutate, ma con una funzione pura Character → Character (es. i riposi del motore),
   * applicata allo stato più recente nel DB.
   */
  async transform(id: ID, fn: (c: Character) => Character): Promise<Character | undefined> {
    return db.transaction('rw', db.characters, db.wikiLinks, async () => {
      const current = await db.characters.get(id);
      if (!current) return undefined;
      return writeNext(current, fn(current));
    });
  },

  /** Elimina il personaggio, i suoi snapshot e i suoi collegamenti. */
  async remove(id: ID): Promise<void> {
    await db.transaction('rw', db.characters, db.snapshots, db.wikiLinks, async () => {
      await db.snapshots.where('characterId').equals(id).delete();
      await db.wikiLinks.where('sourceId').equals(id).delete();
      await db.characters.delete(id);
    });
  },
};
