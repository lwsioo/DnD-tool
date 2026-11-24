import type { ID } from '@/domain/primitives';
import type { WikiCategory, WikiEntry } from '@/domain/wiki';
import { normalizeKey } from '@/lib/normalizeKey';
import { db } from '../db';
import { linksForEntry, reindexSource } from '../linkIndexer';

/** Voci wiki della campagna. Ogni scrittura aggiorna l'indice dei [[collegamenti]] per i backlink. */
export const wikiRepo = {
  get(id: ID): Promise<WikiEntry | undefined> {
    return db.wikiEntries.get(id);
  },

  listByCampaign(campaignId: ID): Promise<WikiEntry[]> {
    return db.wikiEntries.where('campaignId').equals(campaignId).sortBy('title');
  },

  listByCategory(campaignId: ID, category: WikiCategory): Promise<WikiEntry[]> {
    return db.wikiEntries.where('[campaignId+category]').equals([campaignId, category]).sortBy('title');
  },

  /** Cerca una voce per titolo o alias (confronto normalizzato). */
  async findByTitle(campaignId: ID, title: string): Promise<WikiEntry | undefined> {
    const key = normalizeKey(title);
    const byTitle = await db.wikiEntries.where('[campaignId+titleKey]').equals([campaignId, key]).first();
    if (byTitle) return byTitle;
    return db.wikiEntries
      .where('aliasKeys')
      .equals(key)
      .filter((e) => e.campaignId === campaignId)
      .first();
  },

  async add(entry: WikiEntry): Promise<void> {
    await this.save(entry);
  },

  /** Salva la voce ricalcolando chiavi normalizzate e collegamenti. */
  async save(entry: WikiEntry): Promise<WikiEntry> {
    const saved: WikiEntry = {
      ...entry,
      titleKey: normalizeKey(entry.title),
      aliasKeys: entry.aliases.map(normalizeKey),
      updatedAt: Date.now(),
    };
    await db.transaction('rw', db.wikiEntries, db.wikiLinks, async () => {
      await db.wikiEntries.put(saved);
      await reindexSource(saved.id, linksForEntry(saved));
    });
    return saved;
  },

  async remove(id: ID): Promise<void> {
    await db.transaction('rw', db.wikiEntries, db.wikiLinks, async () => {
      await db.wikiLinks.where('sourceId').equals(id).delete();
      await db.wikiEntries.delete(id);
    });
  },
};
