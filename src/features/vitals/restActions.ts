import { charactersRepo } from '@/db/repos/characters';
import { snapshotsRepo } from '@/db/repos/snapshots';
import type { ID } from '@/domain/primitives';
import { longRest, shortRest, type RestSummary, type ShortRestInput } from '@/engine/rests';
import { trackSave } from '@/stores/saveStatus';

export interface RestResult {
  summary: RestSummary;
  /** Snapshot salvato prima del riposo, per l'"Annulla". */
  snapshotId: number | undefined;
}

/**
 * Applica un riposo allo stato più recente del personaggio, dopo averne salvato uno snapshot.
 * I valori derivati (PF massimi, mod. COS) li passa il chiamante, calcolati dal motore.
 */
export async function performRest(
  id: ID,
  kind: 'short' | 'long',
  derived: { maxHp: number; conMod: number },
  spellNames: Map<string, string>,
  input: ShortRestInput = { hitDice: [] },
): Promise<RestResult> {
  return trackSave(async () => {
    const snapshotId = await snapshotsRepo.take(id, kind === 'short' ? 'Riposo breve' : 'Riposo lungo');
    let summary: RestSummary | undefined;
    await charactersRepo.transform(id, (c) => {
      const r =
        kind === 'short' ? shortRest(c, derived, input, spellNames) : longRest(c, derived, spellNames);
      summary = r.summary;
      return r.character;
    });
    return { summary: summary!, snapshotId };
  });
}

/** Testo breve del riepilogo per la notifica. */
export function summaryText(kind: 'short' | 'long', s: RestSummary): string {
  const parts = [
    s.hpRecovered > 0 && `+${s.hpRecovered} PF`,
    s.hitDiceSpent > 0 && `${s.hitDiceSpent} dadi vita spesi`,
    s.hitDiceRecovered > 0 && `${s.hitDiceRecovered} dadi vita recuperati`,
    s.slotsRecovered > 0 && `${s.slotsRecovered} slot recuperati`,
    s.pactSlotsRecovered > 0 && `${s.pactSlotsRecovered} slot del Patto`,
    s.recharged.length > 0 && `ricaricati: ${s.recharged.join(', ')}`,
    s.exhaustionReduced && 'Indebolimento −1',
  ].filter(Boolean);
  return `${kind === 'short' ? 'Riposo breve' : 'Riposo lungo'} completato${parts.length ? ': ' + parts.join(' · ') : '.'}`;
}
