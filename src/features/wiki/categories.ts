import type { WikiCategory, WikiEntry } from '@/domain/wiki';
import { m } from '@/i18n';

export const CATEGORY_INFO: Record<
  WikiCategory,
  { slug: string; label: string; singular: string; icon: string }
> = {
  // Gli slug restano italiani: fanno parte degli indirizzi già salvati.
  location: { slug: 'luoghi', ...m.wiki.categories.location, icon: '📍' },
  faction: { slug: 'fazioni', ...m.wiki.categories.faction, icon: '⚔' },
  religion: { slug: 'religioni', ...m.wiki.categories.religion, icon: '☀' },
  npc: { slug: 'npc', ...m.wiki.categories.npc, icon: '👤' },
  session: { slug: 'sessioni', ...m.wiki.categories.session, icon: '📜' },
};

export const CATEGORY_ORDER: WikiCategory[] = ['location', 'faction', 'religion', 'npc', 'session'];

export function categoryFromSlug(slug: string | undefined): WikiCategory | undefined {
  return CATEGORY_ORDER.find((c) => CATEGORY_INFO[c].slug === slug);
}

export function entryPath(e: Pick<WikiEntry, 'campaignId' | 'category' | 'id'>): string {
  return `/campagna/${e.campaignId}/${CATEGORY_INFO[e.category].slug}/${e.id}`;
}

export const NPC_STATUS_LABELS = m.wiki.npcStatus;
export const NPC_ATTITUDE_LABELS = m.wiki.npcAttitude;

/** Titolo mostrato negli elenchi: le sessioni hanno il numero davanti. */
export function displayTitle(e: WikiEntry): string {
  return e.category === 'session' ? m.wiki.sessionTitle(e.meta.number, e.title) : e.title;
}
