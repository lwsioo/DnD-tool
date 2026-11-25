import type { EntityTable, IDType } from 'dexie';
import type { z } from 'zod';
import type { Character } from '@/domain/character';
import { EXPORT_FORMAT, type FullBackupData, type LibraryPackData } from '@/domain/exchange';
import type { LibraryItem, LibraryKind } from '@/domain/library';
import type { ID } from '@/domain/primitives';
import type { Spell } from '@/domain/spells';
import { newId } from '@/lib/id';
import { normalizeKey } from '@/lib/normalizeKey';
import { db } from './db';
import { linksForCharacter, rebuildAllLinks, reindexSource } from './linkIndexer';
import { EXPORT_SCHEMA_VERSION, ImportError } from './migrations';
import { PRE_REPLACE_BACKUP_KEY, SETTING_KEYS } from './repos/settings';
import { snapshotsRepo } from './repos/snapshots';
import type { characterExportSchema, fullBackupSchema, libraryPackSchema } from './schemas';
import { m } from '@/i18n';

const D = m.misc.db;

export { ImportError };

export type CharacterExportFile = z.output<typeof characterExportSchema>;
export type FullBackupFile = z.output<typeof fullBackupSchema>;
export type LibraryPackFile = z.output<typeof libraryPackSchema>;
export type ParsedExport = CharacterExportFile | FullBackupFile | LibraryPackFile;

/** Aggiunge alla libreria ciò che manca di un pacchetto contenuti (non tocca personaggi né campagne). */
export async function applyLibraryPack(data: LibraryPackData): Promise<{ spells: number; items: number }> {
  return db.transaction('rw', db.spells, db.libraryItems, async () => {
    const { toAdd } = await resolveSpells(data.spells);
    const items = await resolveLibraryItems(data.libraryItems);
    await db.spells.bulkAdd(toAdd);
    await db.libraryItems.bulkAdd(items);
    return { spells: toAdd.length, items: items.length };
  });
}

const envelope = () => ({
  format: EXPORT_FORMAT as typeof EXPORT_FORMAT,
  schemaVersion: EXPORT_SCHEMA_VERSION,
  appVersion: __APP_VERSION__,
  exportedAt: new Date().toISOString(),
});

// ── Export ──────────────────────────────────────────────────────────────────────────────

/** File di un singolo personaggio, con gli incantesimi che usa (così è autosufficiente). */
export async function buildCharacterExport(characterId: ID): Promise<CharacterExportFile> {
  const character = await db.characters.get(characterId);
  if (!character) throw new Error(D.notFound);
  const spellIds = [...new Set(character.spellcasting.spells.map((s) => s.spellId))];
  const spells = (await db.spells.bulkGet(spellIds)).filter((s): s is Spell => !!s);
  return { ...envelope(), kind: 'character', data: { character, spells } };
}

/** Tutto l'archivio tranne dati ricostruibili (indice dei link) o locali (snapshot, backup interni). */
export async function buildFullBackupData(): Promise<FullBackupData> {
  const [campaigns, characters, spells, libraryItems, wikiEntries, settings] = await Promise.all([
    db.campaigns.toArray(),
    db.characters.toArray(),
    db.spells.toArray(),
    db.libraryItems.toArray(),
    db.wikiEntries.toArray(),
    db.settings.where('key').anyOf(SETTING_KEYS).toArray(),
  ]);
  return { campaigns, characters, spells, libraryItems, wikiEntries, settings };
}

export async function buildFullBackup(): Promise<FullBackupFile> {
  return { ...envelope(), kind: 'fullBackup', data: await buildFullBackupData() };
}

const slug = (s: string) =>
  normalizeKey(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'personaggio';

/** Pacchetto contenuti: tutta la libreria (incantesimi, specie, background, talenti, oggetti), senza personaggi. */
export async function buildLibraryPack(): Promise<LibraryPackFile> {
  const [spells, libraryItems] = await Promise.all([db.spells.toArray(), db.libraryItems.toArray()]);
  return { ...envelope(), kind: 'library', data: { spells, libraryItems } };
}

export function exportFileName(file: ParsedExport, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  if (file.kind === 'character') return `codex-${slug(file.data.character.identity.name)}-${day}.json`;
  return file.kind === 'library' ? `codex-${D.contentFile}-${day}.json` : `codex-backup-${day}.json`;
}

// ── Pianificazione (anteprima) ──────────────────────────────────────────────────────────

export interface SpellResolution {
  /** Incantesimi da aggiungere alla libreria. */
  toAdd: Spell[];
  /** id nel file → id finale nella libreria locale. */
  idMap: Map<ID, ID>;
  /** Quanti erano già presenti (stesso id, o stesso nome e origine). */
  alreadyPresent: number;
}

/** Deduplica gli incantesimi in arrivo rispetto alla libreria locale (per id, poi per nome + origine). */
export async function resolveSpells(spells: Spell[]): Promise<SpellResolution> {
  const existing = await db.spells.toArray();
  const byId = new Set(existing.map((s) => s.id));
  const byKey = new Map(existing.map((s) => [`${s.nameKey}|${s.origin}`, s.id]));
  const idMap = new Map<ID, ID>();
  const toAdd: Spell[] = [];
  let alreadyPresent = 0;

  for (const s of spells) {
    const key = `${normalizeKey(s.name)}|${s.origin}`;
    if (byId.has(s.id)) {
      idMap.set(s.id, s.id);
      alreadyPresent++;
    } else if (byKey.has(key)) {
      idMap.set(s.id, byKey.get(key)!);
      alreadyPresent++;
    } else {
      const spell = { ...s, nameKey: normalizeKey(s.name) };
      toAdd.push(spell);
      byId.add(spell.id);
      byKey.set(key, spell.id);
      idMap.set(s.id, spell.id);
    }
  }
  return { toAdd, idMap, alreadyPresent };
}

export interface ArchiveCounts {
  characters: number;
  campaigns: number;
  spells: number;
  wikiEntries: number;
  libraryItems: number;
}

export type ImportPlan =
  | {
      kind: 'character';
      file: CharacterExportFile;
      /** Esiste già un personaggio con lo stesso id (es. reimport dello stesso file). */
      existingName: string | null;
      spells: { total: number; alreadyPresent: number; toAdd: number };
      /** La campagna del personaggio non esiste qui: verrà scollegato. */
      campaignMissing: boolean;
    }
  | { kind: 'fullBackup'; file: FullBackupFile; incoming: ArchiveCounts; current: ArchiveCounts }
  | {
      kind: 'library';
      file: LibraryPackFile;
      counts: Record<LibraryCountKey, { total: number; toAdd: number }>;
    };

export type LibraryCountKey = 'spells' | LibraryKind;

const countsOf = (d: FullBackupData): ArchiveCounts => ({
  characters: d.characters.length,
  campaigns: d.campaigns.length,
  spells: d.spells.length,
  wikiEntries: d.wikiEntries.length,
  libraryItems: d.libraryItems.length,
});

/** Voci di libreria nuove rispetto all'archivio (stesso id, o stesso tipo e nome = già presente). */
export async function resolveLibraryItems(items: LibraryItem[]): Promise<LibraryItem[]> {
  const existing = await db.libraryItems.toArray();
  const ids = new Set(existing.map((i) => i.id));
  const keys = new Set(existing.map((i) => `${i.kind}|${i.nameKey}`));
  const out: LibraryItem[] = [];
  for (const item of items) {
    const key = `${item.kind}|${item.nameKey}`;
    if (ids.has(item.id) || keys.has(key)) continue;
    ids.add(item.id);
    keys.add(key);
    out.push(item);
  }
  return out;
}

export async function planImport(file: ParsedExport): Promise<ImportPlan> {
  if (file.kind === 'library') {
    const [spells, items] = await Promise.all([
      resolveSpells(file.data.spells),
      resolveLibraryItems(file.data.libraryItems),
    ]);
    const counts = {} as Record<LibraryCountKey, { total: number; toAdd: number }>;
    counts.spells = { total: file.data.spells.length, toAdd: spells.toAdd.length };
    for (const kind of ['species', 'background', 'feat', 'item', 'feature'] as const) {
      counts[kind] = {
        total: file.data.libraryItems.filter((i) => i.kind === kind).length,
        toAdd: items.filter((i) => i.kind === kind).length,
      };
    }
    return { kind: 'library', file, counts };
  }
  if (file.kind === 'character') {
    const { character, spells } = file.data;
    const [existing, resolution, campaign] = await Promise.all([
      db.characters.get(character.id),
      resolveSpells(spells),
      character.campaignId ? db.campaigns.get(character.campaignId) : Promise.resolve(null),
    ]);
    return {
      kind: 'character',
      file,
      existingName: existing ? existing.identity.name || m.common.unnamed : null,
      spells: {
        total: spells.length,
        alreadyPresent: resolution.alreadyPresent,
        toAdd: resolution.toAdd.length,
      },
      campaignMissing: !!character.campaignId && !campaign,
    };
  }
  return {
    kind: 'fullBackup',
    file,
    incoming: countsOf(file.data),
    current: countsOf(await buildFullBackupData()),
  };
}

// ── Applicazione ────────────────────────────────────────────────────────────────────────

const remapSpells = (c: Character, idMap: Map<ID, ID>): Character => ({
  ...c,
  spellcasting: {
    ...c.spellcasting,
    spells: c.spellcasting.spells.map((s) => ({ ...s, spellId: idMap.get(s.spellId) ?? s.spellId })),
  },
});

/**
 * Importa un personaggio. Se ne esiste già uno con lo stesso id:
 *  - 'copy': lo importa come copia (nuovo id, nome con "(copia)");
 *  - 'replace': lo sovrascrive, dopo averne salvato uno snapshot.
 */
export async function applyCharacterImport(
  file: CharacterExportFile,
  mode: 'copy' | 'replace' = 'copy',
): Promise<{ characterId: ID }> {
  return db.transaction(
    'rw',
    [db.characters, db.spells, db.snapshots, db.campaigns, db.wikiLinks],
    async () => {
      const { toAdd, idMap } = await resolveSpells(file.data.spells);
      await db.spells.bulkAdd(toAdd);

      let c = remapSpells(file.data.character, idMap);
      if (c.campaignId && !(await db.campaigns.get(c.campaignId))) c = { ...c, campaignId: null };

      if (await db.characters.get(c.id)) {
        if (mode === 'replace') {
          await snapshotsRepo.take(c.id, D.beforeImport);
        } else {
          c = { ...c, id: newId(), identity: { ...c.identity, name: D.copy(c.identity.name) } };
        }
      }
      await db.characters.put(c);
      await reindexSource(c.id, linksForCharacter(c));
      return { characterId: c.id };
    },
  );
}

async function upsertNewer<T extends { id: ID; updatedAt: number }>(table: EntityTable<T, 'id'>, rows: T[]) {
  const existing = await table.bulkGet(rows.map((r) => r.id as IDType<T, 'id'>));
  const toPut = rows.filter((r, i) => !existing[i] || existing[i]!.updatedAt < r.updatedAt);
  await table.bulkPut(toPut);
}

/**
 * Importa un backup completo.
 *  - 'replace': salva prima una copia dell'archivio attuale (ripristinabile), poi lo sostituisce.
 *  - 'merge': aggiunge ciò che manca e, per gli stessi elementi, tiene la versione più recente.
 * Al termine l'indice dei wikilink viene ricostruito da zero.
 */
export async function applyFullBackup(data: FullBackupData, mode: 'replace' | 'merge'): Promise<void> {
  if (mode === 'replace') {
    const current = await buildFullBackupData();
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(
        [
          db.campaigns,
          db.characters,
          db.spells,
          db.libraryItems,
          db.wikiEntries,
          db.wikiLinks,
          db.snapshots,
        ].map((t) => t.clear()),
      );
      await db.settings.where('key').notEqual(PRE_REPLACE_BACKUP_KEY).delete();
      await db.settings.put({ key: PRE_REPLACE_BACKUP_KEY, value: { savedAt: Date.now(), data: current } });
      await db.campaigns.bulkAdd(data.campaigns);
      await db.characters.bulkAdd(data.characters);
      await db.spells.bulkAdd(data.spells.map((s) => ({ ...s, nameKey: normalizeKey(s.name) })));
      await db.libraryItems.bulkAdd(data.libraryItems);
      await db.wikiEntries.bulkAdd(data.wikiEntries);
      await db.settings.bulkPut(data.settings.filter((s) => (SETTING_KEYS as string[]).includes(s.key)));
    });
    await rebuildAllLinks();
    return;
  }

  await db.transaction('rw', db.tables, async () => {
    const { toAdd, idMap } = await resolveSpells(data.spells);
    await db.spells.bulkAdd(toAdd);
    const addedIds = new Set(toAdd.map((s) => s.id));
    await upsertNewer(
      db.spells,
      data.spells.filter((s) => !addedIds.has(s.id) && idMap.get(s.id) === s.id),
    );
    await upsertNewer(db.campaigns, data.campaigns);
    await upsertNewer(db.libraryItems, data.libraryItems);
    await upsertNewer(db.wikiEntries, data.wikiEntries);
    await upsertNewer(
      db.characters,
      data.characters.map((c) => remapSpells(c, idMap)),
    );
    const present = new Set((await db.settings.toArray()).map((s) => s.key));
    await db.settings.bulkPut(
      data.settings.filter((s) => (SETTING_KEYS as string[]).includes(s.key) && !present.has(s.key)),
    );
  });
  await rebuildAllLinks();
}

export interface PreReplaceBackup {
  savedAt: number;
  data: FullBackupData;
}

export async function getPreReplaceBackup(): Promise<PreReplaceBackup | null> {
  const record = await db.settings.get(PRE_REPLACE_BACKUP_KEY);
  return (record?.value as PreReplaceBackup | undefined) ?? null;
}

/** Torna all'archivio com'era prima dell'ultima "Sostituisci tutto" (lo stato attuale diventa il nuovo ripristino). */
export async function restorePreReplaceBackup(): Promise<boolean> {
  const backup = await getPreReplaceBackup();
  if (!backup) return false;
  await applyFullBackup(backup.data, 'replace');
  return true;
}
