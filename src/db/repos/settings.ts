import type { ID } from '@/domain/primitives';
import { pick } from '@/i18n/locale';
import { db } from '../db';

/** Id dei dati dimostrativi caricati con "Carica esempio", per poterli rimuovere in un clic. */
export interface ExampleRecord {
  characterId: ID;
  campaignId: ID;
  spellIds: ID[];
}

/** Impostazioni globali dell'app salvate in IndexedDB (incluse nel backup completo). */
export interface AppSettings {
  units: 'metric' | 'imperial';
  /** Timestamp dell'ultimo backup completo esportato, per il promemoria. */
  lastBackupAt: number | null;
  example: ExampleRecord | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  // In inglese si parte da piedi e libbre, come nei manuali originali.
  units: pick('metric', 'imperial'),
  lastBackupAt: null,
  example: null,
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof AppSettings>;

/**
 * Chiave riservata: copia dell'archivio salvata prima di una "Sostituisci tutto".
 * Non fa parte di AppSettings (è grande) e non viene esportata.
 */
export const PRE_REPLACE_BACKUP_KEY = 'preReplaceBackup';

export const settingsRepo = {
  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const record = await db.settings.get(key);
    return record ? (record.value as AppSettings[K]) : DEFAULT_SETTINGS[key];
  },

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await db.settings.put({ key, value });
  },

  /** Solo le chiavi note di AppSettings, sopra ai valori predefiniti. */
  async getAll(): Promise<AppSettings> {
    const records = await db.settings.where('key').anyOf(SETTING_KEYS).toArray();
    const stored = Object.fromEntries(records.map((r) => [r.key, r.value]));
    return { ...DEFAULT_SETTINGS, ...stored } as AppSettings;
  },
};
