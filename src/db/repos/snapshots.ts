import type { Snapshot } from '@/domain/library';
import type { ID } from '@/domain/primitives';
import { db } from '../db';
import { linksForCharacter, reindexSource } from '../linkIndexer';

export const MAX_SNAPSHOTS_PER_CHARACTER = 20;

/** Copie di sicurezza del personaggio prima di operazioni "grosse" (riposi, import, eliminazioni). */
export const snapshotsRepo = {
  async take(characterId: ID, reason: string): Promise<number | undefined> {
    return db.transaction('rw', db.characters, db.snapshots, async () => {
      const character = await db.characters.get(characterId);
      if (!character) return undefined;
      const id = await db.snapshots.add({ characterId, reason, createdAt: Date.now(), data: character });
      // Mantiene solo gli ultimi N snapshot del personaggio.
      const all = await db.snapshots.where('characterId').equals(characterId).sortBy('createdAt');
      const excess = all.slice(0, Math.max(0, all.length - MAX_SNAPSHOTS_PER_CHARACTER));
      await db.snapshots.bulkDelete(excess.map((s) => s.id!));
      return id;
    });
  },

  list(characterId: ID): Promise<Snapshot[]> {
    return db.snapshots.where('characterId').equals(characterId).reverse().sortBy('createdAt');
  },

  /** Ripristina il personaggio allo stato dello snapshot (lo snapshot resta disponibile). */
  async restore(snapshotId: number): Promise<boolean> {
    return db.transaction('rw', db.characters, db.snapshots, db.wikiLinks, async () => {
      const snap = await db.snapshots.get(snapshotId);
      if (!snap) return false;
      await db.characters.put({ ...snap.data, updatedAt: Date.now() });
      await reindexSource(snap.data.id, linksForCharacter(snap.data));
      return true;
    });
  },
};
