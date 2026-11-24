import type { Character } from './character';
import type { LibraryItem, SettingRecord } from './library';
import type { Spell } from './spells';
import type { Campaign, WikiEntry } from './wiki';

export const EXPORT_FORMAT = 'codex-dnd';

export interface CharacterExportData {
  character: Character;
  /** Solo gli incantesimi referenziati dal personaggio, per un file autosufficiente. */
  spells: Spell[];
}

export interface FullBackupData {
  campaigns: Campaign[];
  characters: Character[];
  spells: Spell[];
  libraryItems: LibraryItem[];
  wikiEntries: WikiEntry[];
  settings: SettingRecord[];
}

/** Pacchetto contenuti: tutto ciò che serve per ritrovarsi la stessa libreria su un altro dispositivo. */
export interface LibraryPackData {
  spells: Spell[];
  libraryItems: LibraryItem[];
}

interface ExportEnvelope {
  format: typeof EXPORT_FORMAT;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
}

export type ExportFile =
  | (ExportEnvelope & { kind: 'character'; data: CharacterExportData })
  | (ExportEnvelope & { kind: 'fullBackup'; data: FullBackupData })
  | (ExportEnvelope & { kind: 'library'; data: LibraryPackData });
