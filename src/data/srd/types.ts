import type { Markdown } from '@/domain/primitives';
import { LOCALE } from '@/i18n/locale';

/**
 * Voce di regola della libreria statica. I testi sono riassunti in italiano delle regole
 * del System Reference Document 5.2 (CC-BY-4.0, vedi attribution.ts).
 *
 * Nel `body` si possono citare altre regole con link interni, aperti nell'Inspector:
 *   [Prono](cond:prone) · [Accurata](prop:finesse) · [Rovesciare](mastery:topple)
 */
export interface RuleEntry<K extends string = string> {
  key: K;
  name: string;
  /** Nome inglese (2024), utile per confrontare con 5etools e i manuali. */
  nameEn: string;
  /** Una riga, per tooltip e risultati di ricerca. */
  summary: string;
  body: Markdown;
}

/** Testi inglesi di una voce di regola (il nome inglese è già in `nameEn`). */
export interface RuleTextEn {
  summary: string;
  body: Markdown;
}

/** Nella lingua inglese sostituisce nome, riassunto e testo con la versione inglese. */
export function localizeRules<K extends string, E extends RuleEntry<K>>(
  entries: Record<K, E>,
  en: Record<K, RuleTextEn>,
): Record<K, E> {
  if (LOCALE !== 'en') return entries;
  return Object.fromEntries(
    (Object.entries(entries) as Array<[K, E]>).map(([k, e]) => [k, { ...e, name: e.nameEn, ...en[k] }]),
  ) as Record<K, E>;
}
