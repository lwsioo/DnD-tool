import type { Ability } from './abilities';
import type { DamageType, Feet, ID, Markdown, Timestamps } from './primitives';

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation';

export interface Spell extends Timestamps {
  id: ID;
  origin: 'srd' | 'custom' | 'import';
  sourceBook?: string;
  name: string;
  /** normalizeKey(name): per ricerca, wikilink e deduplica. */
  nameKey: string;
  /** Nome inglese, per deduplicare gli import 5etools. */
  nameEn?: string;
  level: SpellLevel;
  school: SpellSchool;
  castingTime: {
    amount: number;
    unit: 'action' | 'bonus' | 'reaction' | 'minute' | 'hour';
    condition?: string;
  };
  ritual: boolean;
  range: {
    kind: 'self' | 'touch' | 'distance' | 'sight' | 'unlimited' | 'special';
    distance?: Feet;
    area?: { shape: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere' | 'emanation'; size: Feet };
  };
  components: {
    v: boolean;
    s: boolean;
    m: boolean;
    material?: string;
    costGp?: number;
    consumed?: boolean;
  };
  duration: {
    kind: 'instant' | 'timed' | 'untilDispelled' | 'special';
    amount?: number;
    unit?: 'round' | 'minute' | 'hour' | 'day';
    concentration: boolean;
  };
  description: Markdown;
  /** Box "A Livelli Superiori". */
  higherLevels?: Markdown;
  scaling?: {
    /** Dadi del trucchetto ai livelli personaggio 1 / 5 / 11 / 17. */
    cantrip?: [string, string, string, string];
    /** Incremento per ogni livello di slot sopra il base, es. "1d6". */
    perSlot?: string;
  };
  classes: string[];
  tags: string[];
  save?: Ability;
  attack?: 'melee' | 'ranged';
  damageTypes?: DamageType[];
}
