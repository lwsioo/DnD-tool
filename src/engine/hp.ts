import type { Character } from '@/domain/character';
import type { Die } from '@/domain/primitives';
import { addParts } from './effects';
import type { FormulaVars } from './formula';
import type { ActiveEffect, Breakdown, Part } from './types';
import { m } from '@/i18n';

/** Media fissa per livello: metà dado + 1 (d8 → 5, d10 → 6). */
export const averageHitDie = (die: Die) => die / 2 + 1;

/**
 * PF massimi.
 *  - manuale: il valore inserito, così com'è (si presume includa già tutto).
 *  - automatico: dado pieno al 1° livello della classe iniziale, poi tiri o media fissa,
 *    + mod. COS per livello (minimo 1 PF per livello) + effetti 'hp.max' (es. Robusto "2 * lvl").
 */
export function computeMaxHp(
  c: Character,
  conMod: number,
  effects: ActiveEffect[],
  vars: FormulaVars,
): Breakdown {
  const hp = c.combat.hp;
  if (hp.maxMode === 'manual') {
    const v = Math.max(0, hp.maxManual ?? 0);
    return { total: v, parts: [{ label: m.engine.manualValue, value: v }] };
  }

  const perLevel: number[] = [];
  c.classes.forEach((cl, classIndex) => {
    for (let l = 1; l <= cl.level; l++) {
      if (classIndex === 0 && l === 1) perLevel.push(cl.hitDie);
      else {
        const roll = cl.hpRolls?.[classIndex === 0 ? l - 2 : l - 1];
        perLevel.push(roll ?? averageHitDie(cl.hitDie));
      }
    }
  });
  if (perLevel.length === 0) return { total: 0, parts: [] };

  const [first = 0, ...rest] = perLevel;
  const parts: Part[] = [{ label: m.engine.hpFirstLevel, value: first }];
  if (rest.length) parts.push({ label: m.engine.hpLaterLevels, value: rest.reduce((a, b) => a + b, 0) });
  if (conMod) parts.push({ label: m.engine.hpCon(perLevel.length), value: conMod * perLevel.length });
  const minimumFix = perLevel.reduce((a, v) => a + Math.max(0, 1 - (v + conMod)), 0);
  if (minimumFix) parts.push({ label: m.engine.hpMinimum, value: minimumFix });
  parts.push(...addParts(effects, ['hp.max'], vars));
  return {
    total: Math.max(
      0,
      parts.reduce((a, p) => a + p.value, 0),
    ),
    parts,
  };
}

export interface HitDicePool {
  die: Die;
  total: number;
  spent: number;
  remaining: number;
}

/** Dadi vita per tipo (multiclasse: d10 del guerriero e d6 del mago separati), dal più grande. */
export function hitDicePools(c: Character): HitDicePool[] {
  const totals = new Map<Die, number>();
  for (const cl of c.classes) totals.set(cl.hitDie, (totals.get(cl.hitDie) ?? 0) + cl.level);
  return [...totals.entries()]
    .sort(([a], [b]) => b - a)
    .map(([die, total]) => {
      const spent = Math.min(total, c.combat.hitDice[die]?.spent ?? 0);
      return { die, total, spent, remaining: total - spent };
    });
}

export interface HpState {
  current: number;
  temp: number;
  deathSaves: { successes: number; failures: number };
}

export interface DamageOutcome {
  state: HpState;
  absorbedByTemp: number;
  droppedToZero: boolean;
  /** Danno residuo ≥ PF massimi: morte istantanea (regola 2024). */
  instantDeath: boolean;
  /** Fallimenti ai TS contro morte aggiunti (danno subito a 0 PF: 1, critico: 2). */
  deathSaveFailuresAdded: number;
  /** CD del TS di COS per mantenere la concentrazione, se si stava concentrando. */
  concentrationDC?: number;
}

export function concentrationDC(damage: number): number {
  return Math.min(30, Math.max(10, Math.floor(damage / 2)));
}

export function applyDamage(
  state: HpState,
  amount: number,
  maxHp: number,
  opts: { concentrating?: boolean; critical?: boolean } = {},
): DamageOutcome {
  const dmg = Math.max(0, Math.floor(amount));
  const absorbedByTemp = Math.min(state.temp, dmg);
  const remaining = dmg - absorbedByTemp;
  const wasAtZero = state.current <= 0;
  const current = Math.max(0, state.current - remaining);
  const overflow = remaining - state.current;

  const deathSaves = { ...state.deathSaves };
  let deathSaveFailuresAdded = 0;
  if (wasAtZero && remaining > 0) {
    deathSaveFailuresAdded = opts.critical ? 2 : 1;
    deathSaves.failures = Math.min(3, deathSaves.failures + deathSaveFailuresAdded);
  }

  return {
    state: { current, temp: state.temp - absorbedByTemp, deathSaves },
    absorbedByTemp,
    droppedToZero: !wasAtZero && current === 0 && remaining > 0,
    instantDeath: remaining > 0 && (wasAtZero ? remaining >= maxHp : overflow >= maxHp),
    deathSaveFailuresAdded,
    concentrationDC: opts.concentrating && dmg > 0 ? concentrationDC(dmg) : undefined,
  };
}

/** Cura fino al massimo; tornando sopra 0 PF i TS contro morte si azzerano. */
export function applyHealing(state: HpState, amount: number, maxHp: number): HpState {
  const heal = Math.max(0, Math.floor(amount));
  const current = Math.min(maxHp, state.current + heal);
  const revived = state.current <= 0 && current > 0;
  return { ...state, current, deathSaves: revived ? { successes: 0, failures: 0 } : state.deathSaves };
}

/** I PF temporanei non si sommano: si tiene il valore più alto. */
export function applyTempHp(state: HpState, amount: number): HpState {
  return { ...state, temp: Math.max(state.temp, Math.max(0, Math.floor(amount))) };
}
