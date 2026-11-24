/**
 * Chiave di confronto per titoli, nomi e wikilink:
 * minuscolo, senza accenti, apostrofi tipografici uniformati, spazi compattati.
 * "  Città  dell'Ombra " → "citta dell'ombra"
 */
export function normalizeKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
