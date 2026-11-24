import type { Ability } from './abilities';
import type { Effect } from './effects';
import type { DamageType, Feet, ID, Markdown } from './primitives';

/** MR · MA · ME · MO · MP */
export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export type MasteryKey = 'cleave' | 'graze' | 'nick' | 'push' | 'sap' | 'slow' | 'topple' | 'vex';

export type SimplePropertyKey =
  'ammunition' | 'finesse' | 'heavy' | 'light' | 'loading' | 'reach' | 'twoHanded' | 'versatile';
export type RangedPropertyKey = 'range' | 'thrown';
export type WeaponPropertyKey = SimplePropertyKey | RangedPropertyKey;

export type WeaponPropertyRef =
  { key: SimplePropertyKey } | { key: RangedPropertyKey; normal: Feet; long: Feet };

export interface WeaponData {
  /** Riferimento alla tabella base SRD, es. 'longsword'. */
  baseId?: string;
  category: 'simple' | 'martial';
  type: 'melee' | 'ranged';
  damage: { dice: string; type: DamageType };
  versatileDice?: string;
  properties: WeaponPropertyRef[];
  mastery?: MasteryKey;
  magicBonus: number;
  /** Forza la caratteristica (es. Arti Marziali del Monaco). */
  abilityOverride?: Ability;
  /** Impugnatura corrente: principale, secondaria, a due mani. */
  hand: 'main' | 'off' | 'two';
  ammoItemId?: ID;
}

export interface ArmorData {
  category: 'light' | 'medium' | 'heavy';
  baseAc: number;
  /** null = nessun limite (leggera), 2 = media, 0 = pesante. */
  dexCap: number | null;
  strRequirement?: number;
  stealthDisadvantage: boolean;
  magicBonus: number;
}

export type ItemKind =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'focus'
  | 'gear'
  | 'container'
  | 'consumable'
  | 'tool'
  | 'treasure'
  | 'ammunition';

export interface InventoryItem {
  id: ID;
  /** Contenitore padre (albero piatto). null = portato addosso. */
  parentId: ID | null;
  kind: ItemKind;
  name: string;
  quantity: number;
  weightLb?: number;
  valueCp?: number;
  equipped: boolean;
  attunement?: 'none' | 'required' | 'attuned';
  description?: Markdown;
  effects: Effect[];
  weapon?: WeaponData;
  armor?: ArmorData;
  shield?: { acBonus: number };
  container?: { capacityLb?: number; weightless: boolean; collapsed: boolean };
  libraryRef?: ID;
}
