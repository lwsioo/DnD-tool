import type { Markdown } from '@/domain/primitives';

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
