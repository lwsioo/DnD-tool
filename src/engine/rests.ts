import { produce, type Draft } from 'immer';
import type { Character } from '@/domain/character';
import type { Die } from '@/domain/primitives';
import type { Recharge, UsesTracker } from '@/domain/resources';
import { hitDicePools } from './hp';

export interface RestSummary {
  hpRecovered: number;
  hitDiceSpent: number;
  hitDiceRecovered: number;
  /** Nomi delle risorse ricaricate (privilegi e lanci gratuiti). */
  recharged: string[];
  slotsRecovered: number;
  pactSlotsRecovered: number;
  exhaustionReduced: boolean;
}

/** Nuovo valore di `used` dopo un riposo. */
export function rechargeUses(used: number, recharge: Recharge, rest: 'short' | 'long'): number {
  const amount = rest === 'short' ? recharge.shortRest : recharge.longRest;
  if (amount === 'all') return 0;
  return Math.max(0, used - amount);
}

function rechargeAll(d: Draft<Character>, rest: 'short' | 'long', spellNames: Map<string, string>): string[] {
  const recharged: string[] = [];
  const apply = (t: UsesTracker | undefined, name: string) => {
    if (!t || t.used === 0) return;
    const next = rechargeUses(t.used, t.recharge, rest);
    if (next !== t.used) {
      t.used = next;
      recharged.push(name);
    }
  };
  for (const f of d.features) apply(f.uses, f.name);
  for (const s of d.spellcasting.spells) apply(s.freeUses, spellNames.get(s.spellId) ?? 'Incantesimo');
  return recharged;
}

export interface ShortRestInput {
  /** Dadi vita spesi con il risultato del tiro (solo il dado, senza COS). */
  hitDice: Array<{ die: Die; roll: number }>;
}

export interface RestDerived {
  maxHp: number;
  conMod: number;
}

/**
 * Riposo Breve: spende dadi vita (dado + mod. COS ciascuno, minimo 0), ricarica le risorse
 * con `shortRest` e gli slot del Patto. Funzione pura: usabile anche per l'anteprima.
 */
export function shortRest(
  c: Character,
  derived: RestDerived,
  input: ShortRestInput,
  spellNames: Map<string, string> = new Map(),
): { character: Character; summary: RestSummary } {
  const summary: RestSummary = {
    hpRecovered: 0,
    hitDiceSpent: 0,
    hitDiceRecovered: 0,
    recharged: [],
    slotsRecovered: 0,
    pactSlotsRecovered: 0,
    exhaustionReduced: false,
  };
  const remaining = new Map(hitDicePools(c).map((p) => [p.die, p.remaining]));

  const character = produce(c, (d) => {
    let healed = 0;
    for (const { die, roll } of input.hitDice) {
      const left = remaining.get(die) ?? 0;
      if (left <= 0) continue;
      remaining.set(die, left - 1);
      d.combat.hitDice[die] = { spent: (d.combat.hitDice[die]?.spent ?? 0) + 1 };
      healed += Math.max(0, roll + derived.conMod);
      summary.hitDiceSpent++;
    }
    const before = d.combat.hp.current;
    d.combat.hp.current = Math.min(derived.maxHp, before + healed);
    summary.hpRecovered = d.combat.hp.current - before;
    if (before <= 0 && d.combat.hp.current > 0) d.combat.deathSaves = { successes: 0, failures: 0 };

    summary.recharged = rechargeAll(d, 'short', spellNames);
    if (d.spellcasting.pact && d.spellcasting.pact.used > 0) {
      summary.pactSlotsRecovered = d.spellcasting.pact.used;
      d.spellcasting.pact.used = 0;
    }
  });
  return { character, summary };
}

/**
 * Riposo Lungo (2024): PF al massimo, tutti i dadi vita, tutti gli slot, risorse con `longRest`,
 * Indebolimento −1, TS contro morte azzerati, concentrazione terminata;
 * PF temporanei azzerati e Ispirazione Eroica secondo le impostazioni del personaggio.
 */
export function longRest(
  c: Character,
  derived: Pick<RestDerived, 'maxHp'>,
  spellNames: Map<string, string> = new Map(),
): { character: Character; summary: RestSummary } {
  const summary: RestSummary = {
    hpRecovered: 0,
    hitDiceSpent: 0,
    hitDiceRecovered: 0,
    recharged: [],
    slotsRecovered: 0,
    pactSlotsRecovered: 0,
    exhaustionReduced: false,
  };

  const character = produce(c, (d) => {
    summary.hpRecovered = Math.max(0, derived.maxHp - d.combat.hp.current);
    d.combat.hp.current = derived.maxHp;
    if (d.settings.clearTempHpOnLongRest) d.combat.hp.temp = 0;

    summary.hitDiceRecovered = hitDicePools(c).reduce((a, p) => a + p.spent, 0);
    d.combat.hitDice = {};

    summary.slotsRecovered = d.spellcasting.slots.used.reduce((a, n) => a + n, 0);
    d.spellcasting.slots.used = Array(9).fill(0);
    if (d.spellcasting.pact) {
      summary.pactSlotsRecovered = d.spellcasting.pact.used;
      d.spellcasting.pact.used = 0;
    }

    summary.recharged = rechargeAll(d, 'long', spellNames);

    if (d.combat.exhaustion > 0) {
      d.combat.exhaustion = (d.combat.exhaustion - 1) as Character['combat']['exhaustion'];
      summary.exhaustionReduced = true;
    }
    d.combat.deathSaves = { successes: 0, failures: 0 };
    // Con i PF al massimo non si è più Privi di Sensi.
    d.combat.conditions = d.combat.conditions.filter((k) => k !== 'unconscious');
    delete d.combat.concentration;
    if (d.settings.heroicInspirationOnLongRest) d.combat.heroicInspiration = true;
  });
  return { character, summary };
}
