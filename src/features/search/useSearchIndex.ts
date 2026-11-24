import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';
import { buildDocs, createIndex } from './searchIndex';

/**
 * Indice di ricerca in memoria, ricostruito quando cambiano voci, incantesimi o personaggi.
 * Con qualche centinaio di documenti la costruzione richiede pochi millisecondi.
 */
export function useSearchIndex(enabled: boolean) {
  const data = useLiveQuery(
    async () =>
      enabled
        ? {
            entries: await db.wikiEntries.toArray(),
            campaigns: await db.campaigns.toArray(),
            spells: await db.spells.toArray(),
            characters: await db.characters.toArray(),
          }
        : null,
    [enabled],
  );
  const active = useActiveCharacter().character;
  return useMemo(() => (data ? createIndex(buildDocs({ ...data, active })) : null), [data, active]);
}
