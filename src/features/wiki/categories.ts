import type { WikiCategory, WikiEntry } from '@/domain/wiki';

export const CATEGORY_INFO: Record<
  WikiCategory,
  { slug: string; label: string; singular: string; icon: string }
> = {
  location: { slug: 'luoghi', label: 'Luoghi', singular: 'Luogo', icon: '📍' },
  faction: { slug: 'fazioni', label: 'Fazioni', singular: 'Fazione', icon: '⚔' },
  religion: { slug: 'religioni', label: 'Religioni', singular: 'Religione', icon: '☀' },
  npc: { slug: 'npc', label: 'NPC', singular: 'NPC', icon: '👤' },
  session: { slug: 'sessioni', label: 'Diario Sessioni', singular: 'Sessione', icon: '📜' },
};

export const CATEGORY_ORDER: WikiCategory[] = ['location', 'faction', 'religion', 'npc', 'session'];

export function categoryFromSlug(slug: string | undefined): WikiCategory | undefined {
  return CATEGORY_ORDER.find((c) => CATEGORY_INFO[c].slug === slug);
}

export function entryPath(e: Pick<WikiEntry, 'campaignId' | 'category' | 'id'>): string {
  return `/campagna/${e.campaignId}/${CATEGORY_INFO[e.category].slug}/${e.id}`;
}

export const NPC_STATUS_LABELS = { alive: 'Vivo', dead: 'Morto', unknown: 'Sconosciuto' } as const;
export const NPC_ATTITUDE_LABELS = {
  ally: 'Alleato',
  friendly: 'Amichevole',
  neutral: 'Neutrale',
  hostile: 'Ostile',
  unknown: 'Sconosciuta',
} as const;

/** Titolo mostrato negli elenchi: le sessioni hanno il numero davanti. */
export function displayTitle(e: WikiEntry): string {
  return e.category === 'session' ? `Sessione ${e.meta.number} — ${e.title}` : e.title;
}
