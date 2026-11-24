import { normalizeKey } from './normalizeKey';

/** Un collegamento [[Destinazione]] o [[Destinazione|testo visibile]] trovato in un testo. */
export interface ParsedWikilink {
  target: string;
  alias?: string;
  /** Chiave normalizzata della destinazione. */
  key: string;
  index: number;
  length: number;
}

export const WIKILINK_RE = /\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]/g;

export function parseWikilinks(text: string): ParsedWikilink[] {
  const out: ParsedWikilink[] = [];
  for (const m of text.matchAll(WIKILINK_RE)) {
    const target = m[1]!.trim();
    if (!target) continue;
    out.push({
      target,
      alias: m[2]?.trim() || undefined,
      key: normalizeKey(target),
      index: m.index!,
      length: m[0].length,
    });
  }
  return out;
}

/** ~`radius` caratteri attorno al collegamento, su una riga, per "Menzionato in…". */
export function snippetAround(text: string, index: number, length: number, radius = 60): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  const raw = text.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${raw}${end < text.length ? '…' : ''}`;
}

/**
 * Sostituisce i collegamenti a `oldTitle` (confronto normalizzato) con `newTitle`,
 * conservando l'eventuale testo visibile. Restituisce il testo e quante sostituzioni ha fatto.
 */
export function renameWikilinks(
  text: string,
  oldTitle: string,
  newTitle: string,
): { text: string; count: number } {
  const oldKey = normalizeKey(oldTitle);
  let count = 0;
  const result = text.replace(WIKILINK_RE, (full, target: string, alias?: string) => {
    if (normalizeKey(target) !== oldKey) return full;
    count++;
    return alias ? `[[${newTitle}|${alias}]]` : `[[${newTitle}]]`;
  });
  return { text: result, count };
}
