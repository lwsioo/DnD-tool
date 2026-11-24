import { SRD_BACKGROUNDS, SRD_FEATS, SRD_SPECIES } from '@/data/srd/origins';
import { ImportError, type LibraryCountKey } from '@/db/backup';
import { db } from '@/db/db';
import { spellsRepo } from '@/db/repos/spells';
import { EXPORT_FORMAT } from '@/domain/exchange';
import type { LibraryItem } from '@/domain/library';
import type { FeatDef } from '@/domain/origins';
import type { Spell } from '@/domain/spells';
import { normalizeKey } from '@/lib/normalizeKey';
import {
  bundleToLibraryItems,
  convertFiveEtoolsFiles,
  isFiveEtoolsContent,
  spellLookupKey,
} from './fiveEtoolsContent';

/**
 * Import di contenuti da più file in una volta: file 5etools (spell, race, background, feat, item)
 * e pacchetti contenuti di Codex. Ogni voce diventa un candidato, marcato come doppione se esiste già.
 */

export type ContentCandidate = {
  key: string;
  kind: LibraryCountKey;
  name: string;
  source?: string;
  duplicate: boolean;
} & ({ spell: Spell } | { item: LibraryItem });

export interface ContentPlan {
  candidates: ContentCandidate[];
  /** Messaggi per file non riconosciuti o non adatti. */
  warnings: string[];
  /** Voci ignorate perché incomplete o copie di altre (`_copy` di 5etools). */
  skipped: number;
  /** Incantesimi già in libreria che ricevono l'elenco delle classi. */
  classUpdates: Array<{ id: string; classes: string[] }>;
}

const SRD_ORIGIN_KEYS = new Set(
  [
    ...SRD_SPECIES.map((s) => `species|${s.nameEn}`),
    ...SRD_BACKGROUNDS.map((b) => `background|${b.nameEn}`),
    ...SRD_FEATS.map((f) => `feat|${f.nameEn}`),
  ].map((k) => normalizeKey(k)),
);

const itemName = (it: LibraryItem) => it.data.name;
const itemSource = (it: LibraryItem) => ('sourceBook' in it.data ? it.data.sourceBook : undefined);
const itemNameEn = (it: LibraryItem) => ('nameEn' in it.data ? it.data.nameEn : undefined);

export async function planContentImport(files: Array<{ name: string; text: string }>): Promise<ContentPlan> {
  const warnings: string[] = [];
  const raws: unknown[] = [];
  const codexSpells: Spell[] = [];
  const codexItems: LibraryItem[] = [];

  for (const f of files) {
    let data: unknown;
    try {
      data = JSON.parse(f.text);
    } catch {
      warnings.push(`${f.name}: non è un JSON valido.`);
      continue;
    }
    if (
      typeof data === 'object' &&
      data !== null &&
      (data as { format?: unknown }).format === EXPORT_FORMAT
    ) {
      try {
        const { parseImportText } = await import('@/db/importParse');
        const parsed = parseImportText(f.text);
        if (parsed.kind === 'library') {
          codexSpells.push(...parsed.data.spells);
          codexItems.push(...parsed.data.libraryItems);
        } else {
          warnings.push(
            `${f.name}: è un personaggio o un backup completo, usa «Importa file…» nelle Impostazioni.`,
          );
        }
      } catch (e) {
        warnings.push(`${f.name}: ${e instanceof ImportError ? e.message : 'file Codex non valido.'}`);
      }
      continue;
    }
    if (isFiveEtoolsContent(data)) raws.push(data);
    else warnings.push(`${f.name}: nessuna sezione riconosciuta (spell, race, background, feat, item).`);
  }

  const dbItems = await db.libraryItems.toArray();
  const dbFeats = dbItems.flatMap((i) => (i.kind === 'feat' ? [i.data as FeatDef] : []));
  const bundle = convertFiveEtoolsFiles(raws, [...SRD_FEATS, ...dbFeats]);
  const spells = [...codexSpells, ...bundle.spells];
  const items = [...codexItems, ...bundleToLibraryItems(bundle)];

  const existingSpells = await db.spells.toArray();
  const spellKeys = new Set(
    existingSpells.flatMap((s) => [s.nameKey, normalizeKey(s.nameEn ?? '')]).filter(Boolean),
  );
  const itemIds = new Set(dbItems.map((i) => i.id));
  const itemKeys = new Set([
    ...SRD_ORIGIN_KEYS,
    ...dbItems.flatMap((i) => [
      `${i.kind}|${i.nameKey}`,
      ...(itemNameEn(i) ? [normalizeKey(`${i.kind}|${itemNameEn(i)}`)] : []),
    ]),
  ]);

  const candidates: ContentCandidate[] = [];
  for (const spell of spells) {
    const keys = [spell.nameKey, normalizeKey(spell.nameEn ?? '')].filter(Boolean);
    const duplicate = keys.some((k) => spellKeys.has(k));
    keys.forEach((k) => spellKeys.add(k));
    candidates.push({
      key: `spell:${spell.id}`,
      kind: 'spells',
      name: spell.name,
      source: spell.sourceBook,
      duplicate,
      spell,
    });
  }
  for (const item of items) {
    const keys = [
      `${item.kind}|${item.nameKey}`,
      ...(itemNameEn(item) ? [normalizeKey(`${item.kind}|${itemNameEn(item)}`)] : []),
    ];
    const duplicate = itemIds.has(item.id) || keys.some((k) => itemKeys.has(k));
    itemIds.add(item.id);
    keys.forEach((k) => itemKeys.add(k));
    candidates.push({
      key: `${item.kind}:${item.id}`,
      kind: item.kind,
      name: itemName(item),
      source: itemSource(item),
      duplicate,
      item,
    });
  }
  // Incantesimi già in libreria senza elenco delle classi: le prende dal file di lookup.
  const classUpdates = existingSpells.flatMap((s) => {
    const classes = bundle.spellClasses.get(spellLookupKey(s.sourceBook, s.nameEn ?? s.name));
    return classes && !s.classes.length ? [{ id: s.id, classes }] : [];
  });
  return { candidates, warnings, skipped: bundle.skipped, classUpdates };
}

export async function applyContentImport(
  selected: ContentCandidate[],
  classUpdates: ContentPlan['classUpdates'] = [],
): Promise<{ spells: number; items: number }> {
  const spells = selected.flatMap((c) => ('spell' in c ? [c.spell] : []));
  const items = selected.flatMap((c) => ('item' in c ? [c.item] : []));
  await db.transaction('rw', db.spells, db.libraryItems, async () => {
    if (spells.length) await spellsRepo.bulkSave(spells);
    if (items.length) await db.libraryItems.bulkPut(items);
    for (const u of classUpdates) await db.spells.update(u.id, { classes: u.classes });
  });
  return { spells: spells.length, items: items.length };
}
