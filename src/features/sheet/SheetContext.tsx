import { createContext, useContext } from 'react';
import type { CharacterRecipe } from '@/db/repos/characters';
import type { Character } from '@/domain/character';
import type { DerivedCharacter } from '@/engine/derive';

export interface SheetContextValue {
  character: Character;
  derived: DerivedCharacter;
  /** Modalità Modifica attiva. */
  edit: boolean;
  /** Scrittura immediata (contatori, interruttori). */
  mutate: (recipe: CharacterRecipe) => void;
  /** Scrittura differita per i campi di testo e numerici; `key` identifica il campo. */
  mutateLater: (key: string, recipe: CharacterRecipe) => void;
}

export const SheetContext = createContext<SheetContextValue | null>(null);

export function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet va usato dentro la scheda personaggio');
  return ctx;
}
