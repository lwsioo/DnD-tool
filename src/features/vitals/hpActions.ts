import { charactersRepo } from '@/db/repos/characters';
import type { Character } from '@/domain/character';
import type { ID } from '@/domain/primitives';
import { applyDamage, applyHealing, applyTempHp, type DamageOutcome, type HpState } from '@/engine/hp';
import { trackSave } from '@/stores/saveStatus';

type DeathSaves = Character['combat']['deathSaves'];

const hpState = (c: Pick<Character, 'combat'>): HpState => ({
  current: c.combat.hp.current,
  temp: c.combat.hp.temp,
  deathSaves: { ...c.combat.deathSaves },
});

/**
 * Infligge danni al personaggio (prima ai PF temporanei). Scendendo a 0 PF diventa Privo di Sensi
 * e perde la concentrazione. Restituisce l'esito per le notifiche (CD concentrazione, morte istantanea…).
 */
export async function dealDamage(
  id: ID,
  amount: number,
  maxHp: number,
  critical = false,
): Promise<DamageOutcome | undefined> {
  let outcome: DamageOutcome | undefined;
  await trackSave(() =>
    charactersRepo.mutate(id, (d) => {
      outcome = applyDamage(hpState(d), amount, maxHp, { concentrating: !!d.combat.concentration, critical });
      d.combat.hp.current = outcome.state.current;
      d.combat.hp.temp = outcome.state.temp;
      d.combat.deathSaves = outcome.state.deathSaves as DeathSaves;
      if (outcome.droppedToZero) {
        if (!d.combat.conditions.includes('unconscious')) d.combat.conditions.push('unconscious');
        delete d.combat.concentration;
      }
    }),
  );
  return outcome;
}

/** Cura fino ai PF massimi; tornando sopra 0 PF non si è più Privi di Sensi. */
export async function heal(id: ID, amount: number, maxHp: number): Promise<number> {
  let healed = 0;
  await trackSave(() =>
    charactersRepo.mutate(id, (d) => {
      const before = d.combat.hp.current;
      const next = applyHealing(hpState(d), amount, maxHp);
      healed = next.current - before;
      d.combat.hp.current = next.current;
      d.combat.deathSaves = next.deathSaves as DeathSaves;
      if (before <= 0 && next.current > 0) {
        d.combat.conditions = d.combat.conditions.filter((k) => k !== 'unconscious');
      }
    }),
  );
  return healed;
}

/** PF temporanei: si tiene il valore più alto (non si sommano). */
export async function grantTempHp(id: ID, amount: number): Promise<void> {
  await trackSave(() =>
    charactersRepo.mutate(id, (d) => {
      d.combat.hp.temp = applyTempHp(hpState(d), amount).temp;
    }),
  );
}
