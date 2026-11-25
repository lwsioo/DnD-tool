import { charactersRepo } from '@/db/repos/characters';
import { snapshotsRepo } from '@/db/repos/snapshots';
import type { ID } from '@/domain/primitives';
import { longRest, shortRest, type RestSummary, type ShortRestInput } from '@/engine/rests';
import { trackSave } from '@/stores/saveStatus';
import { m } from '@/i18n';

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
    const snapshotId = await snapshotsRepo.take(id, kind === 'short' ? m.vitals.shortRestLower : m.vitals.longRestLower);
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
    s.hpRecovered > 0 && m.vitals.summary.hp(s.hpRecovered),
    s.hitDiceSpent > 0 && m.vitals.summary.hitDiceSpent(s.hitDiceSpent),
    s.hitDiceRecovered > 0 && m.vitals.summary.hitDiceRecovered(s.hitDiceRecovered),
    s.slotsRecovered > 0 && m.vitals.summary.slots(s.slotsRecovered),
    s.pactSlotsRecovered > 0 && m.vitals.summary.pact(s.pactSlotsRecovered),
    s.recharged.length > 0 && m.vitals.summary.recharged(s.recharged.join(', ')),
    s.exhaustionReduced && m.vitals.summary.exhaustion,
  ].filter(Boolean);
  return m.vitals.summary.done(kind === 'short' ? m.vitals.shortRestLower : m.vitals.longRestLower, parts.join(' · '));
}
