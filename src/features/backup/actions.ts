import { buildCharacterExport, buildFullBackup, buildLibraryPack, exportFileName } from '@/db/backup';
import { db } from '@/db/db';
import { linksForCharacter, reindexSource } from '@/db/linkIndexer';
import { settingsRepo } from '@/db/repos/settings';
import type { Character } from '@/domain/character';
import type { Snapshot } from '@/domain/library';
import type { ID } from '@/domain/primitives';
import { downloadJson } from '@/lib/download';

export async function exportCharacterToFile(characterId: ID): Promise<string> {
  const file = await buildCharacterExport(characterId);
  const name = exportFileName(file);
  downloadJson(name, file);
  return name;
}

export async function exportFullBackupToFile(): Promise<string> {
  const file = await buildFullBackup();
  const name = exportFileName(file);
  downloadJson(name, file);
  await settingsRepo.set('lastBackupAt', Date.now());
  return name;
}

/** Scarica incantesimi e libreria (specie, background, talenti, oggetti) in un unico file da condividere. */
export async function exportLibraryPackToFile(): Promise<string> {
  const file = await buildLibraryPack();
  const name = exportFileName(file);
  downloadJson(name, file);
  return name;
}

export interface DeletedCharacter {
  character: Character;
  snapshots: Snapshot[];
}

/** Elimina un personaggio conservandone una copia in memoria, per l'"Annulla". */
export async function deleteCharacterWithUndo(id: ID): Promise<DeletedCharacter | null> {
  return db.transaction('rw', db.characters, db.snapshots, db.wikiLinks, async () => {
    const character = await db.characters.get(id);
    if (!character) return null;
    const snapshots = await db.snapshots.where('characterId').equals(id).toArray();
    await db.snapshots.where('characterId').equals(id).delete();
    await db.wikiLinks.where('sourceId').equals(id).delete();
    await db.characters.delete(id);
    return { character, snapshots };
  });
}

export async function restoreDeletedCharacter(deleted: DeletedCharacter): Promise<void> {
  await db.transaction('rw', db.characters, db.snapshots, db.wikiLinks, async () => {
    await db.characters.put(deleted.character);
    await reindexSource(deleted.character.id, linksForCharacter(deleted.character));
    await db.snapshots.bulkPut(deleted.snapshots);
  });
}

export const BACKUP_REMINDER_DAYS = 14;
export const DAY = 86_400_000;

/** Vero se conviene ricordare il backup: ci sono dati e l'ultimo backup è assente o vecchio. */
export function shouldRemindBackup(opts: {
  hasData: boolean;
  lastBackupAt: number | null;
  snoozeUntil: number;
  now?: number;
}): boolean {
  const now = opts.now ?? Date.now();
  if (!opts.hasData || now < opts.snoozeUntil) return false;
  return opts.lastBackupAt === null || now - opts.lastBackupAt > BACKUP_REMINDER_DAYS * DAY;
}
