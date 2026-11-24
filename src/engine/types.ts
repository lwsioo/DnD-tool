import type { ProfLevel } from '@/domain/abilities';
import type { Effect } from '@/domain/effects';

/** Una voce della scomposizione di un valore, per i tooltip: "Mod. DES +2", "Competenza +3". */
export interface Part {
  label: string;
  value: number;
}

export interface Breakdown {
  total: number;
  parts: Part[];
}

export type RollMode = 'normal' | 'advantage' | 'disadvantage' | 'cancelled';

export interface RollModeInfo {
  /** 'cancelled' = vantaggio e svantaggio presenti insieme: si tira normalmente. */
  mode: RollMode;
  /** Fonti del vantaggio / svantaggio, per il badge. */
  advantage: string[];
  disadvantage: string[];
}

/** Tiro d20 (TS, abilità, iniziativa, attacco) con bonus scomposto e stato vantaggio/svantaggio. */
export interface RollStat extends Breakdown, RollModeInfo {
  prof: ProfLevel;
}

/** Effetto attivo con la sua fonte leggibile ("Corazza a piastre", "Talento Allerta"). */
export interface ActiveEffect extends Effect {
  source: string;
}

/** Dati esterni al personaggio di cui il motore ha bisogno (libreria statica: step 3). */
export interface DeriveContext {
  /** Effetti meccanici delle condizioni, per chiave (es. poisoned → svantaggio ad attacchi e prove). */
  conditionEffects?: Record<string, Effect[]>;
  /** Nome leggibile delle condizioni, per le fonti dei badge. */
  conditionNames?: Record<string, string>;
}
