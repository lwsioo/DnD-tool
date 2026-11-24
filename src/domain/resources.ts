import type { Formula } from './primitives';

/**
 * Quanti usi si recuperano a ogni riposo: 'all' = tutti, numero = quel numero, 0 = nessuno.
 * Es. Incanalare Divinità (2024): shortRest 1, longRest 'all'.
 */
export interface Recharge {
  shortRest: 'all' | number;
  longRest: 'all' | number;
}

export interface UsesTracker {
  /** Massimo usi, come formula: "3", "pb", "mod.cha", "max(1, mod.wis)". */
  max: Formula;
  used: number;
  recharge: Recharge;
  /** Mostrato nel widget risorse della barra laterale. */
  pinned: boolean;
}
