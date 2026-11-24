import Dexie, { type EntityTable } from 'dexie';
import type { Character } from '@/domain/character';
import type { LibraryItem, SettingRecord, Snapshot } from '@/domain/library';
import type { Spell } from '@/domain/spells';
import type { Campaign, WikiEntry, WikiLink } from '@/domain/wiki';

export const DB_NAME = 'codex-dnd';

/**
 * Database IndexedDB dell'app.
 * Per cambiare lo schema: aggiungere `this.version(n).stores({...}).upgrade(tx => ...)`,
 * senza mai modificare le versioni precedenti.
 */
export class CodexDB extends Dexie {
  campaigns!: EntityTable<Campaign, 'id'>;
  characters!: EntityTable<Character, 'id'>;
  spells!: EntityTable<Spell, 'id'>;
  libraryItems!: EntityTable<LibraryItem, 'id'>;
  wikiEntries!: EntityTable<WikiEntry, 'id'>;
  wikiLinks!: EntityTable<WikiLink, 'id'>;
  snapshots!: EntityTable<Snapshot, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
      campaigns: 'id, name, updatedAt',
      characters: 'id, campaignId, updatedAt',
      spells: 'id, nameKey, nameEn, level, school, origin, *classes, *tags',
      libraryItems: 'id, kind, nameKey',
      wikiEntries: 'id, campaignId, [campaignId+category], [campaignId+titleKey], *aliasKeys, updatedAt',
      wikiLinks: '++id, sourceId, [campaignId+targetKey]',
      snapshots: '++id, characterId, createdAt',
      settings: 'key',
    });
  }
}

export const db = new CodexDB();
