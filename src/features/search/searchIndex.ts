import MiniSearch from 'minisearch';
import { ARMOR, ARMOR_CATEGORY_LABELS } from '@/data/srd/armor';
import { CONDITION_KEYS, CONDITIONS } from '@/data/srd/conditions';
import { WEAPON_MASTERIES } from '@/data/srd/weaponMasteries';
import { WEAPON_PROPERTIES } from '@/data/srd/weaponProperties';
import { SRD_BACKGROUNDS, SRD_FEATS, SRD_SPECIES } from '@/data/srd/origins';
import { WEAPONS } from '@/data/srd/weapons';
import type { Character } from '@/domain/character';
import type { MasteryKey, WeaponPropertyKey } from '@/domain/items';
import type { Spell } from '@/domain/spells';
import type { Campaign, WikiEntry } from '@/domain/wiki';
import { FEATURE_CATEGORY_LABELS, ITEM_KIND_LABELS } from '@/features/inspector/format';
import type { InspectorRef } from '@/features/inspector/refs';
import { spellLevelLine } from '@/features/grimoire/spellText';
import { CATEGORY_INFO, displayTitle, entryPath } from '@/features/wiki/categories';
import { normalizeKey } from '@/lib/normalizeKey';
import { m as msg } from '@/i18n';

export type SearchKind = 'wiki' | 'spell' | 'character' | 'feature' | 'item' | 'rule';

/** Un elemento ricercabile: Invio lo apre nell'Inspector (ref), Ctrl+Invio va alla pagina (path). */
export interface SearchDoc {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  aliases?: string;
  text?: string;
  tags?: string;
  ref?: InspectorRef;
  path?: string;
}

export const KIND_GROUPS: Array<{ kind: SearchKind; label: string }> = [
  { kind: 'wiki', label: msg.search.groups.wiki },
  { kind: 'character', label: msg.search.groups.character },
  { kind: 'feature', label: msg.search.groups.feature },
  { kind: 'item', label: msg.search.groups.item },
  { kind: 'spell', label: msg.search.groups.spell },
  { kind: 'rule', label: msg.search.groups.rule },
];

/** Testo leggibile da Markdown: niente simboli di formattazione né sintassi dei link. */
/** Testo semplice per l'indice; tollera valori mancanti (contenuti importati incompleti). */
const plain = (md: string | undefined | null) =>
  String(md ?? '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>`[\]|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Regole statiche: condizioni, proprietà, maestrie, armi e armature SRD. */
export function ruleDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const k of CONDITION_KEYS) {
    const c = CONDITIONS[k];
    docs.push({
      id: `cond:${k}`,
      kind: 'rule',
      title: c.name,
      subtitle: msg.search.condition,
      aliases: c.nameEn,
      text: c.summary,
      ref: { kind: 'condition', key: k },
    });
  }
  for (const k of Object.keys(WEAPON_PROPERTIES) as WeaponPropertyKey[]) {
    const p = WEAPON_PROPERTIES[k];
    docs.push({
      id: `prop:${k}`,
      kind: 'rule',
      title: p.name,
      subtitle: msg.search.weaponProperty,
      aliases: p.nameEn,
      text: p.summary,
      ref: { kind: 'property', key: k },
    });
  }
  for (const k of Object.keys(WEAPON_MASTERIES) as MasteryKey[]) {
    const m = WEAPON_MASTERIES[k];
    docs.push({
      id: `mastery:${k}`,
      kind: 'rule',
      title: m.name,
      subtitle: msg.search.weaponMastery,
      aliases: m.nameEn,
      text: m.summary,
      ref: { kind: 'mastery', key: k },
    });
  }
  for (const w of WEAPONS) {
    docs.push({
      id: `weapon:${w.id}`,
      kind: 'rule',
      title: w.name,
      subtitle: msg.search.weaponKind(w.category === 'simple'),
      aliases: w.nameEn,
      ref: { kind: 'weapon', id: w.id },
    });
  }
  for (const a of ARMOR) {
    docs.push({
      id: `armor:${a.id}`,
      kind: 'rule',
      title: a.name,
      subtitle: ARMOR_CATEGORY_LABELS[a.category],
      aliases: a.nameEn,
      ref: { kind: 'armor', id: a.id },
    });
  }
  const origins: Array<
    [string, Array<{ id: string; name: string; nameEn?: string }>, 'species' | 'background' | 'feat']
  > = [
    [msg.search.species, SRD_SPECIES, 'species'],
    [msg.search.background, SRD_BACKGROUNDS, 'background'],
    [msg.search.originFeat, SRD_FEATS, 'feat'],
  ];
  for (const [subtitle, list, kind] of origins) {
    for (const d of list) {
      docs.push({
        id: `${kind}:${d.id}`,
        kind: 'rule',
        title: d.name,
        subtitle,
        aliases: d.nameEn,
        ref: { kind, id: d.id },
      });
    }
  }
  return docs;
}

export interface SearchSources {
  entries: WikiEntry[];
  campaigns: Campaign[];
  spells: Spell[];
  characters: Character[];
  /** Personaggio attivo: i suoi privilegi e oggetti diventano ricercabili. */
  active?: Character;
}

export function buildDocs(src: SearchSources): SearchDoc[] {
  const campaignName = new Map(src.campaigns.map((c) => [c.id, c.name]));
  const docs: SearchDoc[] = [];
  for (const e of src.entries) {
    docs.push({
      id: `wiki:${e.id}`,
      kind: 'wiki',
      title: displayTitle(e),
      subtitle: `${CATEGORY_INFO[e.category].singular} · ${campaignName.get(e.campaignId) ?? ''}`,
      aliases: e.aliases.join(' '),
      text: plain(e.body),
      tags: e.tags.join(' '),
      ref: { kind: 'wiki', id: e.id },
      path: entryPath(e),
    });
  }
  for (const s of src.spells) {
    docs.push({
      id: `spell:${s.id}`,
      kind: 'spell',
      title: s.name,
      subtitle: spellLevelLine(s),
      aliases: s.nameEn,
      text: plain(s.description),
      tags: s.classes.join(' '),
      ref: { kind: 'spell', id: s.id },
    });
  }
  for (const c of src.characters) {
    const classes = c.classes.map((x) => `${x.name} ${x.level}`).join(' / ');
    docs.push({
      id: `character:${c.id}`,
      kind: 'character',
      title: c.identity.name || msg.search.unnamed,
      subtitle: [c.identity.species, classes].filter(Boolean).join(' · '),
      path: `/pg/${c.id}/scheda`,
    });
  }
  if (src.active) {
    const a = src.active;
    for (const f of a.features) {
      docs.push({
        id: `feature:${f.id}`,
        kind: 'feature',
        title: f.name,
        subtitle: [FEATURE_CATEGORY_LABELS[f.category], f.origin].filter(Boolean).join(' · '),
        text: plain(f.description),
        ref: { kind: 'feature', characterId: a.id, featureId: f.id },
        path: `/pg/${a.id}/scheda`,
      });
    }
    for (const i of a.inventory.items) {
      docs.push({
        id: `item:${i.id}`,
        kind: 'item',
        title: i.name,
        subtitle: ITEM_KIND_LABELS[i.kind],
        text: plain(i.description ?? ''),
        ref: { kind: 'item', characterId: a.id, itemId: i.id },
        path: `/pg/${a.id}/inventario`,
      });
    }
  }
  return [...docs, ...ruleDocs()];
}

/** Indice full-text: prefissi, tolleranza agli errori, accenti e maiuscole ignorati; il titolo pesa di più. */
export function createIndex(docs: SearchDoc[]): MiniSearch<SearchDoc> {
  const index = new MiniSearch<SearchDoc>({
    fields: ['title', 'aliases', 'tags', 'text'],
    storeFields: ['id', 'kind', 'title', 'subtitle', 'ref', 'path'],
    processTerm: (term) => normalizeKey(term) || null,
    searchOptions: {
      boost: { title: 4, aliases: 3, tags: 2, text: 0.5 },
      prefix: true,
      fuzzy: (term) => (term.length > 3 ? 0.2 : false),
      combineWith: 'AND',
    },
  });
  // MiniSearch rifiuta id ripetuti: ne basta uno doppio nei dati per bloccare tutta la ricerca.
  const seen = new Set<string>();
  index.addAll(
    docs
      .filter((d) => !seen.has(d.id) && seen.add(d.id))
      .map((d) => ({
        ...d,
        title: String(d.title ?? ''),
        aliases: d.aliases ? String(d.aliases) : undefined,
      })),
  );
  return index;
}

export interface ParsedQuery {
  mode: 'all' | 'wiki' | 'tag' | 'command';
  text: string;
}

/** Prefissi: `>` comandi, `@` solo voci della campagna, `#` per tag. */
export function parseQuery(raw: string): ParsedQuery {
  const q = raw.trimStart();
  if (q.startsWith('>')) return { mode: 'command', text: q.slice(1).trim() };
  if (q.startsWith('@')) return { mode: 'wiki', text: q.slice(1).trim() };
  if (q.startsWith('#')) return { mode: 'tag', text: q.slice(1).trim() };
  return { mode: 'all', text: q.trim() };
}

export type SearchHit = Pick<SearchDoc, 'id' | 'kind' | 'title' | 'subtitle' | 'ref' | 'path'>;

/** Risultati raggruppati per tipo, al massimo `perGroup` per gruppo. */
export function searchGrouped(
  index: MiniSearch<SearchDoc>,
  query: ParsedQuery,
  perGroup = 6,
): Array<{ kind: SearchKind; label: string; hits: SearchHit[] }> {
  if (!query.text || query.mode === 'command') return [];
  const results =
    query.mode === 'tag'
      ? index.search(query.text, { fields: ['tags'], filter: (r) => r.kind === 'wiki' })
      : index.search(query.text, query.mode === 'wiki' ? { filter: (r) => r.kind === 'wiki' } : undefined);
  // Gruppi ordinati per pertinenza del loro miglior risultato (a parità, nell'ordine di KIND_GROUPS).
  return KIND_GROUPS.map(({ kind, label }, order) => {
    const ofKind = results.filter((r) => r.kind === kind);
    return {
      kind,
      label,
      order,
      best: ofKind[0]?.score ?? 0,
      hits: ofKind.slice(0, perGroup) as unknown as SearchHit[],
    };
  })
    .filter((g) => g.hits.length > 0)
    .sort((a, b) => b.best - a.best || a.order - b.order)
    .map(({ kind, label, hits }) => ({ kind, label, hits }));
}
