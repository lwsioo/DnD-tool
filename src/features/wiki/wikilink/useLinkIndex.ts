import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import type { ID } from '@/domain/primitives';
import { normalizeKey } from '@/lib/normalizeKey';
import type { LinkIndex, WikiTarget } from './resolve';

/** Indice dei nomi collegabili: voci della campagna (titoli e alias) e incantesimi della libreria. */
export function useLinkIndex(campaignId: ID | null): LinkIndex {
  const entries = useLiveQuery(
    async () => (campaignId ? db.wikiEntries.where('campaignId').equals(campaignId).toArray() : []),
    [campaignId],
    [],
  );
  const spells = useLiveQuery(() => db.spells.toArray(), [], []);
  return useMemo(() => {
    const wiki = new Map<string, WikiTarget>();
    for (const e of entries) {
      const target = { id: e.id, campaignId: e.campaignId, title: e.title, category: e.category };
      for (const k of e.aliasKeys) wiki.set(k, target);
      wiki.set(e.titleKey, target); // il titolo vince sugli alias omonimi
    }
    const spellMap = new Map<string, { id: ID; name: string }>();
    for (const s of spells) {
      if (s.nameEn) spellMap.set(normalizeKey(s.nameEn), { id: s.id, name: s.name });
      spellMap.set(s.nameKey, { id: s.id, name: s.name });
    }
    return { wiki, spells: spellMap };
  }, [entries, spells]);
}
