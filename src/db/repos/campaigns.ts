import type { Campaign } from '@/domain/wiki';
import { createCampaign } from '@/domain/factories';
import type { ID } from '@/domain/primitives';
import { db } from '../db';

export const campaignsRepo = {
  list(): Promise<Campaign[]> {
    return db.campaigns.orderBy('name').toArray();
  },

  get(id: ID): Promise<Campaign | undefined> {
    return db.campaigns.get(id);
  },

  async create(name: string): Promise<Campaign> {
    const campaign = createCampaign(name);
    await db.campaigns.add(campaign);
    return campaign;
  },

  async rename(id: ID, name: string): Promise<void> {
    await db.campaigns.update(id, { name, updatedAt: Date.now() });
  },

  /** Elimina la campagna con tutte le sue voci wiki; i personaggi restano, scollegati. */
  async remove(id: ID): Promise<void> {
    await db.transaction('rw', [db.campaigns, db.wikiEntries, db.wikiLinks, db.characters], async () => {
      await db.wikiEntries.where('campaignId').equals(id).delete();
      await db.wikiLinks.where('[campaignId+targetKey]').between([id, ''], [id, '￿']).delete();
      await db.characters
        .where('campaignId')
        .equals(id)
        .modify((c) => {
          c.campaignId = null;
        });
      await db.campaigns.delete(id);
    });
  },
};
