import type { ID, Markdown, Timestamps } from './primitives';

export interface Campaign extends Timestamps {
  id: ID;
  name: string;
  description?: Markdown;
}

export const WIKI_CATEGORIES = ['location', 'faction', 'religion', 'npc', 'session'] as const;
export type WikiCategory = (typeof WIKI_CATEGORIES)[number];

export interface WikiEntryBase extends Timestamps {
  id: ID;
  campaignId: ID;
  category: WikiCategory;
  title: string;
  /** normalizeKey(title). */
  titleKey: string;
  aliases: string[];
  aliasKeys: string[];
  body: Markdown;
  tags: string[];
  pinned: boolean;
  image?: string;
}

export interface NpcMeta {
  factionIds: ID[];
  locationId?: ID;
  status: 'alive' | 'dead' | 'unknown';
  attitude: 'ally' | 'friendly' | 'neutral' | 'hostile' | 'unknown';
  role?: string;
  species?: string;
}

export interface LocationMeta {
  region?: string;
  parentLocationId?: ID;
  factionIds: ID[];
  locationType?: string;
}

export interface FactionMeta {
  leaderIds: ID[];
  headquartersId?: ID;
  religionId?: ID;
  goals?: string;
  attitude?: string;
}

export interface ReligionMeta {
  deity?: string;
  domains: string[];
  symbol?: string;
  alignment?: string;
}

export interface SessionMeta {
  number: number;
  /** Data reale ISO (YYYY-MM-DD). */
  date: string;
  inGameDate?: string;
  participantIds: ID[];
}

export type WikiEntry =
  | (WikiEntryBase & { category: 'npc'; meta: NpcMeta })
  | (WikiEntryBase & { category: 'location'; meta: LocationMeta })
  | (WikiEntryBase & { category: 'faction'; meta: FactionMeta })
  | (WikiEntryBase & { category: 'religion'; meta: ReligionMeta })
  | (WikiEntryBase & { category: 'session'; meta: SessionMeta });

export type WikiMetaFor<C extends WikiCategory> = Extract<WikiEntry, { category: C }>['meta'];

/** Indice dei collegamenti per i backlink: ricostruibile, non esportato. */
export interface WikiLink {
  id?: number;
  campaignId: ID;
  sourceKind: 'wiki' | 'characterNotes';
  sourceId: ID;
  /** titleKey/aliasKey per i link testuali, "id:<uuid>" per i riferimenti nei metadati. */
  targetKey: string;
  origin: 'body' | 'meta';
  /** ~120 caratteri attorno al link, per "Menzionato in…". */
  snippet: string;
}
