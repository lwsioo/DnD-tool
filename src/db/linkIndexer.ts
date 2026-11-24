import type { Character } from '@/domain/character';
import type { ID } from '@/domain/primitives';
import type { WikiEntry, WikiLink } from '@/domain/wiki';
import { normalizeKey } from '@/lib/normalizeKey';
import { parseWikilinks, renameWikilinks, snippetAround } from '@/lib/wikilinks';
import { db } from './db';

/**
 * Indice dei collegamenti tra voci, per i backlink ("Menzionato in…").
 * È un dato derivato: si ricalcola a ogni salvataggio di una voce o delle note di un personaggio,
 * e da zero dopo un import (rebuildAllLinks).
 */

/** Riferimenti strutturati nei metadati (Fazione, Luogo, Capo…), indicizzati come "id:<uuid>". */
export function metaReferences(entry: WikiEntry): ID[] {
  switch (entry.category) {
    case 'npc':
      return [...entry.meta.factionIds, ...(entry.meta.locationId ? [entry.meta.locationId] : [])];
    case 'location':
      return [
        ...entry.meta.factionIds,
        ...(entry.meta.parentLocationId ? [entry.meta.parentLocationId] : []),
      ];
    case 'faction':
      return [
        ...entry.meta.leaderIds,
        ...(entry.meta.headquartersId ? [entry.meta.headquartersId] : []),
        ...(entry.meta.religionId ? [entry.meta.religionId] : []),
      ];
    default:
      return [];
  }
}

export function linksForEntry(entry: WikiEntry): WikiLink[] {
  const body = parseWikilinks(entry.body).map<WikiLink>((l) => ({
    campaignId: entry.campaignId,
    sourceKind: 'wiki',
    sourceId: entry.id,
    targetKey: l.key,
    origin: 'body',
    snippet: snippetAround(entry.body, l.index, l.length),
  }));
  const meta = [...new Set(metaReferences(entry))].map<WikiLink>((id) => ({
    campaignId: entry.campaignId,
    sourceKind: 'wiki',
    sourceId: entry.id,
    targetKey: `id:${id}`,
    origin: 'meta',
    snippet: '',
  }));
  return [...body, ...meta];
}

export function linksForCharacter(c: Pick<Character, 'id' | 'campaignId' | 'notes'>): WikiLink[] {
  if (!c.campaignId) return [];
  return parseWikilinks(c.notes).map((l) => ({
    campaignId: c.campaignId!,
    sourceKind: 'characterNotes',
    sourceId: c.id,
    targetKey: l.key,
    origin: 'body',
    snippet: snippetAround(c.notes, l.index, l.length),
  }));
}

/** Da chiamare dentro una transazione che includa wikiLinks. */
export async function reindexSource(sourceId: ID, links: WikiLink[]): Promise<void> {
  await db.wikiLinks.where('sourceId').equals(sourceId).delete();
  if (links.length) await db.wikiLinks.bulkAdd(links);
}

export async function rebuildAllLinks(): Promise<void> {
  await db.transaction('rw', db.wikiLinks, db.wikiEntries, db.characters, async () => {
    await db.wikiLinks.clear();
    const entries = await db.wikiEntries.toArray();
    const characters = await db.characters.toArray();
    await db.wikiLinks.bulkAdd([...entries.flatMap(linksForEntry), ...characters.flatMap(linksForCharacter)]);
  });
}

/**
 * All'avvio: se l'indice è vuoto ma esistono voci o note con collegamenti (dati creati con versioni
 * precedenti o arrivati senza indice), lo ricostruisce. Restituisce true se l'ha fatto.
 */
export async function ensureLinkIndex(): Promise<boolean> {
  if ((await db.wikiLinks.count()) > 0) return false;
  const hasEntries = (await db.wikiEntries.count()) > 0;
  const hasNotes = await db.characters.filter((c) => !!c.campaignId && c.notes.includes('[[')).count();
  if (!hasEntries && !hasNotes) return false;
  await rebuildAllLinks();
  return true;
}

export interface Backlink {
  sourceKind: WikiLink['sourceKind'];
  sourceId: ID;
  /** Titolo della voce o nome del personaggio. */
  title: string;
  category?: WikiEntry['category'];
  snippets: string[];
  /** Collegata solo tramite metadati (es. "Fazione: …"). */
  viaMeta: boolean;
}

/** Chi cita una voce: per titolo, alias o riferimento nei metadati. */
export async function backlinksFor(entry: WikiEntry): Promise<Backlink[]> {
  const keys = [entry.titleKey, ...entry.aliasKeys, `id:${entry.id}`];
  const links = await db.wikiLinks
    .where('[campaignId+targetKey]')
    .anyOf(keys.map((k) => [entry.campaignId, k]))
    .toArray();
  const bySource = new Map<ID, WikiLink[]>();
  for (const l of links)
    if (l.sourceId !== entry.id) bySource.set(l.sourceId, [...(bySource.get(l.sourceId) ?? []), l]);

  const out: Backlink[] = [];
  for (const [sourceId, ls] of bySource) {
    const kind = ls[0]!.sourceKind;
    const source = kind === 'wiki' ? await db.wikiEntries.get(sourceId) : await db.characters.get(sourceId);
    if (!source) continue;
    out.push({
      sourceKind: kind,
      sourceId,
      title: 'title' in source ? source.title : source.identity.name,
      category: 'category' in source ? source.category : undefined,
      snippets: [...new Set(ls.filter((l) => l.snippet).map((l) => l.snippet))],
      viaMeta: ls.every((l) => l.origin === 'meta'),
    });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title, 'it'));
}

/** Quante note citano un titolo nel testo (per chiedere conferma prima di rinominare). */
export async function countTextReferences(campaignId: ID, title: string, excludeId: ID) {
  const links = await db.wikiLinks
    .where('[campaignId+targetKey]')
    .equals([campaignId, normalizeKey(title)])
    .filter((l) => l.origin === 'body' && l.sourceId !== excludeId)
    .toArray();
  return { links: links.length, sources: new Set(links.map((l) => l.sourceId)).size };
}

/**
 * Rinomina: riscrive i [[collegamenti]] al vecchio titolo in tutte le voci e note della campagna.
 * Restituisce il numero di collegamenti aggiornati.
 */
export async function propagateRename(campaignId: ID, oldTitle: string, newTitle: string): Promise<number> {
  let total = 0;
  await db.transaction('rw', db.wikiEntries, db.characters, db.wikiLinks, async () => {
    const entries = await db.wikiEntries.where('campaignId').equals(campaignId).toArray();
    for (const e of entries) {
      const { text, count } = renameWikilinks(e.body, oldTitle, newTitle);
      if (!count) continue;
      total += count;
      const saved = { ...e, body: text, updatedAt: Date.now() };
      await db.wikiEntries.put(saved);
      await reindexSource(e.id, linksForEntry(saved));
    }
    const characters = await db.characters.where('campaignId').equals(campaignId).toArray();
    for (const c of characters) {
      const { text, count } = renameWikilinks(c.notes, oldTitle, newTitle);
      if (!count) continue;
      total += count;
      const saved = { ...c, notes: text, updatedAt: Date.now() };
      await db.characters.put(saved);
      await reindexSource(c.id, linksForCharacter(saved));
    }
  });
  return total;
}
