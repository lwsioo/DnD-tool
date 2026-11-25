import { m } from '@/i18n';
/** Versione del formato dei file esportati. Va incrementata a ogni cambiamento incompatibile. */
export const EXPORT_SCHEMA_VERSION = 1;

type Json = Record<string, unknown>;

/**
 * Migrazioni dei file esportati: MIGRATIONS[n] porta un file dalla versione n alla n+1.
 * Lavorano su JSON grezzo, prima della validazione con zod.
 */
const MIGRATIONS: Record<number, (file: Json) => Json> = {
  // 1: (file) => ({ ...file, schemaVersion: 2, ... }),
};

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export function migrateExportFile(raw: Json): Json {
  let file = raw;
  let version = typeof file.schemaVersion === 'number' ? file.schemaVersion : NaN;
  if (!Number.isInteger(version) || version < 1) {
    throw new ImportError(m.misc.db.noVersion);
  }
  if (version > EXPORT_SCHEMA_VERSION) {
    throw new ImportError(m.misc.db.newer(version, EXPORT_SCHEMA_VERSION));
  }
  while (version < EXPORT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new ImportError(m.misc.db.noMigration(version));
    file = step(file);
    version++;
  }
  return file;
}
