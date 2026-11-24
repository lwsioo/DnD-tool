import type { Character, Feature } from './character';
import type { InventoryItem } from './items';
import type { BackgroundDef, FeatDef, SpeciesDef } from './origins';
import type { ID, Timestamps } from './primitives';

/** Modello d'oggetto riutilizzabile (es. un oggetto magico importato da 5etools). */
export type ItemTemplate = Omit<InventoryItem, 'id' | 'parentId' | 'equipped'> & {
  rarity?: string;
  sourceBook?: string;
};

/**
 * Contenuti riutilizzabili della libreria (creati dall'utente o importati):
 * oggetti, privilegi, specie, background e talenti, da aggiungere ai personaggi.
 * Per specie/background/talenti l'id della voce coincide con `data.id`.
 */
export type LibraryItem = Timestamps & { id: ID; nameKey: string } & (
    | { kind: 'item'; data: ItemTemplate }
    | { kind: 'feature'; data: Omit<Feature, 'id'> }
    | { kind: 'species'; data: SpeciesDef }
    | { kind: 'background'; data: BackgroundDef }
    | { kind: 'feat'; data: FeatDef }
  );

export type LibraryKind = LibraryItem['kind'];

export interface Snapshot {
  id?: number;
  characterId: ID;
  createdAt: number;
  /** Es. "Riposo lungo", "Import". */
  reason: string;
  data: Character;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}
