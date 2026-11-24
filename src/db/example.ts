import { buildExampleData, exampleIds } from '@/data/templates/example';
import type { ID } from '@/domain/primitives';
import { db } from './db';
import { linksForCharacter, linksForEntry } from './linkIndexer';
import { campaignsRepo } from './repos/campaigns';
import { charactersRepo } from './repos/characters';
import { settingsRepo } from './repos/settings';

/**
 * Carica personaggio e campagna di esempio. Se sono già presenti restituisce
 * il personaggio esistente invece di duplicarli.
 */
export async function loadExample(): Promise<ID> {
  const current = await settingsRepo.get('example');
  if (current && (await db.characters.get(current.characterId))) return current.characterId;

  const data = buildExampleData();
  await db.transaction(
    'rw',
    [db.characters, db.campaigns, db.spells, db.wikiEntries, db.wikiLinks, db.settings],
    async () => {
      await db.campaigns.add(data.campaign);
      await db.spells.bulkAdd(data.spells);
      await db.wikiEntries.bulkAdd(data.wikiEntries);
      await db.characters.add(data.character);
      await db.wikiLinks.bulkAdd([
        ...data.wikiEntries.flatMap(linksForEntry),
        ...linksForCharacter(data.character),
      ]);
      await settingsRepo.set('example', exampleIds(data));
    },
  );
  return data.character.id;
}

/** Rimuove i dati di esempio; gli incantesimi usati anche da altri personaggi restano. */
export async function removeExample(): Promise<void> {
  const current = await settingsRepo.get('example');
  if (!current) return;
  await charactersRepo.remove(current.characterId);
  if (await db.campaigns.get(current.campaignId)) await campaignsRepo.remove(current.campaignId);
  const stillUsed = new Set(
    (await db.characters.toArray()).flatMap((c) => c.spellcasting.spells.map((s) => s.spellId)),
  );
  await db.spells.bulkDelete(current.spellIds.filter((id) => !stillUsed.has(id)));
  await settingsRepo.set('example', null);
}
