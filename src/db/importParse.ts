import type { z } from 'zod';
import { EXPORT_FORMAT } from '@/domain/exchange';
import type { ParsedExport } from './backup';
import { ImportError, migrateExportFile } from './migrations';
import { exportFileSchema } from './schemas';

/**
 * Lettura e validazione dei file importati. È un modulo a parte perché porta con sé zod e gli schemi:
 * l'app lo carica solo quando serve davvero (import di un file).
 */
// ── Lettura e validazione ───────────────────────────────────────────────────────────────

function formatIssues(error: z.ZodError): string {
  const lines = error.issues.slice(0, 5).map((i) => {
    const path = i.path.map(String).join('.') || '(radice)';
    return `• ${path}: ${i.message}`;
  });
  const more = error.issues.length > 5 ? `\n…e altri ${error.issues.length - 5} problemi.` : '';
  return `Il file contiene dati non validi:\n${lines.join('\n')}${more}`;
}

/** Legge il testo di un file JSON esportato. Lancia ImportError con un messaggio leggibile. */
export function parseImportText(text: string): ParsedExport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('Il file non è un JSON valido.');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ImportError('Formato non riconosciuto: il file non è un export di Codex.');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== EXPORT_FORMAT) {
    if (Array.isArray(obj.spell)) {
      throw new ImportError(
        'Questo sembra un file di incantesimi in formato 5etools: si importa dal Grimorio (in arrivo con lo step 8).',
      );
    }
    throw new ImportError('Formato non riconosciuto: il file non è un export di Codex.');
  }
  const result = exportFileSchema.safeParse(migrateExportFile(obj));
  if (!result.success) throw new ImportError(formatIssues(result.error));
  return result.data;
}
