import type { Draft } from 'immer';
import type { Character, CharacterSpell, CharacterSpellStatus } from '@/domain/character';
import type { ID } from '@/domain/primitives';
import type { Spell } from '@/domain/spells';
import type { SlotsResult } from '@/engine/spellSlots';

/** Modo in cui si lancia un incantesimo. */
export type CastMode =
  | { kind: 'cantrip' }
  | { kind: 'slot'; level: number }
  | { kind: 'pact' }
  | { kind: 'free' }
  | { kind: 'ritual' };

export interface CastOption {
  mode: CastMode;
  label: string;
  /** Livello a cui l'incantesimo viene lanciato (per lo scaling). */
  castLevel: number;
  available: boolean;
}

/**
 * Modi disponibili per lanciare un incantesimo: slot standard dal suo livello in su,
 * slot del Patto se di livello sufficiente, lancio gratuito, rituale.
 */
export function castOptions(
  spell: Spell,
  cs: CharacterSpell,
  slots: SlotsResult,
  freeMax: number,
): CastOption[] {
  if (spell.level === 0)
    return [{ mode: { kind: 'cantrip' }, label: 'Trucchetto', castLevel: 0, available: true }];
  const out: CastOption[] = [];
  if (cs.freeUses) {
    const left = freeMax - cs.freeUses.used;
    out.push({
      mode: { kind: 'free' },
      label: `Lancio gratuito (${Math.max(0, left)}/${freeMax})`,
      castLevel: cs.freeCastLevel ?? spell.level,
      available: left > 0,
    });
  }
  for (const s of slots.standard) {
    if (s.level < spell.level || s.max === 0) continue;
    out.push({
      mode: { kind: 'slot', level: s.level },
      label: `Slot di ${s.level}° livello (${s.max - s.used}/${s.max})`,
      castLevel: s.level,
      available: s.used < s.max,
    });
  }
  if (slots.pact && slots.pact.slotLevel >= spell.level) {
    out.push({
      mode: { kind: 'pact' },
      label: `Slot del Patto di ${slots.pact.slotLevel}° (${slots.pact.max - slots.pact.used}/${slots.pact.max})`,
      castLevel: slots.pact.slotLevel,
      available: slots.pact.used < slots.pact.max,
    });
  }
  if (spell.ritual) {
    out.push({
      mode: { kind: 'ritual' },
      label: 'Come rituale (+10 minuti, senza slot)',
      castLevel: spell.level,
      available: true,
    });
  }
  return out;
}

/**
 * Applica il lancio: consuma la risorsa scelta e, per gli incantesimi a concentrazione,
 * imposta la concentrazione (sostituendo quella precedente).
 */
export function castSpell(d: Draft<Character>, characterSpellId: ID, mode: CastMode, concentration: boolean) {
  const cs = d.spellcasting.spells.find((s) => s.id === characterSpellId);
  if (!cs) return;
  switch (mode.kind) {
    case 'slot': {
      const used = d.spellcasting.slots.used;
      used[mode.level - 1] = (used[mode.level - 1] ?? 0) + 1;
      break;
    }
    case 'pact':
      d.spellcasting.pact = { used: (d.spellcasting.pact?.used ?? 0) + 1 };
      break;
    case 'free':
      if (cs.freeUses) cs.freeUses.used += 1;
      break;
    default:
      break;
  }
  if (concentration) d.combat.concentration = { characterSpellId, since: Date.now() };
}

/** Prossimo stato al clic sull'indicatore: Conosciuto ⇄ Preparato (gli altri stati si cambiano dal menu). */
export function togglePrepared(status: CharacterSpellStatus): CharacterSpellStatus {
  if (status === 'known') return 'prepared';
  if (status === 'prepared') return 'known';
  return status;
}
