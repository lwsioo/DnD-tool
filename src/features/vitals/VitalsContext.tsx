import { createContext, useContext } from 'react';
import type { CharacterRecipe } from '@/db/repos/characters';
import type { Character } from '@/domain/character';
import type { DerivedCharacter } from '@/engine/derive';

export interface VitalsContextValue {
  character: Character;
  derived: DerivedCharacter;
  mutate: (recipe: CharacterRecipe) => void;
  /** Nomi degli incantesimi del personaggio (per risorse e riepiloghi). */
  spellNames: Map<string, string>;
}

export const VitalsContext = createContext<VitalsContextValue | null>(null);

export function useVitals(): VitalsContextValue {
  const ctx = useContext(VitalsContext);
  if (!ctx) throw new Error('useVitals va usato dentro VitalsPanel');
  return ctx;
}
