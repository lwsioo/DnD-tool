import type { z } from 'zod';
import { EXPORT_FORMAT } from '@/domain/exchange';
import type { ParsedExport } from './backup';
import { ImportError, migrateExportFile } from './migrations';
import { exportFileSchema } from './schemas';
import { m } from '@/i18n';

const D = m.misc.db;

/**
 * Lettura e validazione dei file importati. È un modulo a parte perché porta con sé zod e gli schemi:
 * l'app lo carica solo quando serve davvero (import di un file).
 */
// ── Lettura e validazione ───────────────────────────────────────────────────────────────

function formatIssues(error: z.ZodError): string {
  const lines = error.issues.slice(0, 5).map((i) => {
    const path = i.path.map(String).join('.') || D.root;
    return `• ${path}: ${i.message}`;
  });
  const more = error.issues.length > 5 ? D.more(error.issues.length - 5) : '';
  return D.invalidData(lines.join('\n') + more);
}

/** Legge il testo di un file JSON esportato. Lancia ImportError con un messaggio leggibile. */
export function parseImportText(text: string): ParsedExport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError(D.notJson);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ImportError(D.notCodex);
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== EXPORT_FORMAT) {
    if (Array.isArray(obj.spell)) {
      throw new ImportError(D.is5etools);
    }
    throw new ImportError(D.notCodex);
  }
  const result = exportFileSchema.safeParse(migrateExportFile(obj));
  if (!result.success) throw new ImportError(formatIssues(result.error));
  return result.data;
}
