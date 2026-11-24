import type { Ability, SkillKey } from './abilities';
import type { Effect } from './effects';
import type { Feet, Formula, ID, Markdown } from './primitives';
import type { Recharge } from './resources';

/**
 * Origini del personaggio (regole 2024): specie, background e talenti.
 * Le definizioni vengono dalla libreria SRD integrata, da import 5etools o dall'utente;
 * applicandole alla scheda diventano privilegi, competenze e bonus (vedi features/origins).
 */

export type ContentOrigin = 'srd' | 'import' | 'custom';

/** Un tratto che diventa un privilegio della scheda. */
export interface OriginTrait {
  name: string;
  description: Markdown;
  effects?: Array<Omit<Effect, 'id'>>;
  uses?: { max: Formula; recharge: Recharge };
  /** Disponibile solo da questo livello del personaggio (es. Volo Draconico al 5°). */
  minLevel?: number;
  toggleable?: boolean;
}

/** Variante a scelta di una specie: lignaggio elfico, antenato draconico, retaggio infernale… */
export interface SpeciesOption {
  key: string;
  name: string;
  traits: OriginTrait[];
  /** Sostituisce la velocità base (es. Elfo dei Boschi: 35 ft). */
  speed?: Feet;
  /** Concede incantesimi: si crea una fonte da incantatore con la caratteristica scelta. */
  grantsSpells?: boolean;
}

export interface SpeciesDef {
  id: string;
  name: string;
  nameEn?: string;
  origin: ContentOrigin;
  sourceBook?: string;
  sizes: Array<'S' | 'M' | 'L'>;
  speed: Feet;
  darkvision?: Feet;
  traits: OriginTrait[];
  choice?: { label: string; options: SpeciesOption[] };
  /** Competenze in abilità fisse. */
  skills?: SkillKey[];
  /** Competenze in abilità a scelta (Umano: 1 qualsiasi; Elfo: 1 tra Intuizione/Percezione/Sopravvivenza). */
  skillChoice?: { count: number; from?: SkillKey[] };
  /** Concede un talento d'origine a scelta (Umano: Versatile). */
  originFeat?: boolean;
  /** Ispirazione Eroica a ogni Riposo Lungo (Umano: Intraprendente). */
  heroicInspiration?: boolean;
  description?: Markdown;
}

export interface EquipmentLine {
  name: string;
  quantity: number;
  /** Arma SRD corrispondente, per crearla già pronta con danni e Maestria. */
  weaponId?: string;
  weightLb?: number;
}

export interface BackgroundDef {
  id: string;
  name: string;
  nameEn?: string;
  origin: ContentOrigin;
  sourceBook?: string;
  /** Le tre caratteristiche tra cui distribuire +2/+1 o +1/+1/+1. */
  abilities: Ability[];
  /** Talento d'origine concesso (id della libreria o nome, se non presente). */
  featId?: string;
  featName?: string;
  skills: SkillKey[];
  tools: string[];
  /** Opzione A: equipaggiamento (monete comprese in equipmentGoldInA); opzione B: equipmentGold mo. */
  equipment: EquipmentLine[];
  equipmentGoldInA: number;
  equipmentGold: number;
  description?: Markdown;
}

export type FeatCategory = 'origin' | 'general' | 'fightingStyle' | 'epic' | 'other';

export interface FeatDef {
  id: string;
  name: string;
  nameEn?: string;
  origin: ContentOrigin;
  sourceBook?: string;
  category: FeatCategory;
  prerequisite?: string;
  description: Markdown;
  effects?: Array<Omit<Effect, 'id'>>;
  uses?: { max: Formula; recharge: Recharge };
  /** Competenze a scelta concesse (Competente: 3). */
  skillChoices?: number;
  /** Concede incantesimi da una lista di classe (Iniziato alla Magia). */
  spellLists?: string[];
  repeatable?: boolean;
}

/** Ciò che un'origine ha aggiunto alla scheda, per poterlo togliere se la si cambia. */
export interface OriginGrants {
  skills: SkillKey[];
  tools: string[];
  abilityBonus: Partial<Record<Ability, number>>;
  featureIds: ID[];
  spellSourceIds: ID[];
  heroicInspiration: boolean;
}

export interface OriginState {
  speciesId?: string;
  speciesOption?: string;
  backgroundId?: string;
  species: OriginGrants;
  background: OriginGrants;
}

export const emptyGrants = (): OriginGrants => ({
  skills: [],
  tools: [],
  abilityBonus: {},
  featureIds: [],
  spellSourceIds: [],
  heroicInspiration: false,
});

export const ALIGNMENTS = [
  'Legale Buono',
  'Neutrale Buono',
  'Caotico Buono',
  'Legale Neutrale',
  'Neutrale',
  'Caotico Neutrale',
  'Legale Malvagio',
  'Neutrale Malvagio',
  'Caotico Malvagio',
  'Non allineato',
] as const;
