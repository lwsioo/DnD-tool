import { useOutletContext } from 'react-router';
import type { Character } from '@/domain/character';

export interface CharacterOutletContext {
  character: Character;
}

/** Il personaggio della rotta corrente; usabile solo nelle pagine sotto /pg/:charId. */
export function useCurrentCharacter(): Character {
  return useOutletContext<CharacterOutletContext>().character;
}

/** "Guerriero 3 / Mago 2", oppure "Senza classe". */
export function classSummary(c: Character): string {
  if (c.classes.length === 0) return 'Senza classe';
  return c.classes.map((cl) => `${cl.name} ${cl.level}`).join(' / ');
}
