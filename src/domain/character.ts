import type { Ability, ProfLevel, SkillKey } from './abilities';
import type { Effect } from './effects';
import type { Currency, InventoryItem } from './items';
import type { Die, Feet, Formula, ID, Markdown, Timestamps } from './primitives';
import type { OriginState } from './origins';
import type { UsesTracker } from './resources';

export const CHARACTER_SCHEMA_VERSION = 1;

export type CasterProgression = 'none' | 'full' | 'half' | 'third' | 'pact';

export interface ClassEntry {
  id: ID;
  /** 'wizard' per le classi SRD, slug libero per quelle custom. */
  classKey: string;
  name: string;
  subclass?: string;
  level: number;
  hitDie: Die;
  caster: CasterProgression;
  /** Tiri dei PF per i livelli oltre il primo; se assenti si usa la media fissa. */
  hpRolls?: number[];
}

export type FeatureCategory = 'class' | 'subclass' | 'species' | 'background' | 'feat' | 'other';

export interface Feature {
  id: ID;
  category: FeatureCategory;
  name: string;
  /** Provenienza leggibile, es. "Guerriero 2", "Talento d'Origine". */
  origin?: string;
  description: Markdown;
  uses?: UsesTracker;
  effects: Effect[];
  /** Privilegi attivabili (Ira, Forma Selvatica): gli effetti valgono solo se `active`. */
  toggleable: boolean;
  active: boolean;
  libraryRef?: ID;
}

export interface SpellcastingSource {
  id: ID;
  /** Es. "Mago", "Iniziato alla Magia (Chierico)". */
  label: string;
  ability: Ability;
  classEntryId?: ID;
  preparedMax?: Formula;
}

export type CharacterSpellStatus = 'known' | 'prepared' | 'alwaysPrepared' | 'free';

export interface CharacterSpell {
  id: ID;
  spellId: ID;
  sourceId: ID;
  status: CharacterSpellStatus;
  /** Lanci gratuiti (es. 1/Riposo Lungo da talento o specie). */
  freeUses?: UsesTracker;
  freeCastLevel?: number;
  notes?: string;
}

export type ArmorTraining = 'light' | 'medium' | 'heavy' | 'shield';

export interface Character extends Timestamps {
  id: ID;
  schemaVersion: number;
  campaignId: ID | null;

  identity: {
    name: string;
    playerName?: string;
    /** dataURL ridimensionata. */
    portrait?: string;
    species: string;
    size: 'S' | 'M' | 'L';
    background: string;
    alignment?: string;
    deity?: string;
    xp: number;
    appearance?: Markdown;
    backstory?: Markdown;
  };

  /** Multiclasse: [0] è la classe iniziale. */
  classes: ClassEntry[];
  /** `bonus` = incrementi da background, ASI, talenti. */
  abilities: Record<Ability, { base: number; bonus: number }>;
  saves: Record<Ability, ProfLevel>;
  skills: Record<SkillKey, { prof: ProfLevel; abilityOverride?: Ability }>;

  proficiencies: {
    armor: ArmorTraining[];
    /** 'simple' | 'martial' oppure l'id base di un'arma specifica. */
    weapons: string[];
    tools: string[];
    languages: string[];
  };
  /** Id base delle armi di cui si è sbloccata la Maestria. */
  weaponMasteries: string[];

  combat: {
    hp: { current: number; temp: number; maxMode: 'auto' | 'manual'; maxManual?: number };
    /** Dadi vita spesi per tipo; il totale è derivato dalle classi. */
    hitDice: Partial<Record<Die, { spent: number }>>;
    deathSaves: { successes: 0 | 1 | 2 | 3; failures: 0 | 1 | 2 | 3 };
    exhaustion: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    heroicInspiration: boolean;
    speed: { walk: Feet; fly?: Feet; swim?: Feet; climb?: Feet; burrow?: Feet };
    /** Chiavi delle condizioni attive (libreria statica). */
    conditions: string[];
    concentration?: { characterSpellId: ID; since: number };
    acOverride?: number;
  };

  features: Feature[];

  spellcasting: {
    sources: SpellcastingSource[];
    /** used[i] = slot spesi di livello i+1. */
    slots: { used: number[]; maxOverride?: (number | null)[] };
    pact?: { used: number };
    spells: CharacterSpell[];
  };

  inventory: {
    currency: Currency;
    items: InventoryItem[];
  };

  settings: {
    /** Umano (Intraprendente): Ispirazione Eroica a ogni Riposo Lungo. */
    heroicInspirationOnLongRest: boolean;
    clearTempHpOnLongRest: boolean;
    encumbranceRule: 'off' | 'standard' | 'variant';
  };

  /** Note libere del personaggio (supportano [[wikilink]]). */
  notes: Markdown;

  /** Specie e background scelti dalla libreria, con ciò che hanno aggiunto alla scheda. */
  origin?: OriginState;
}
