import { useOutletContext } from 'react-router';
import { canonicalClass } from '@/data/srd/classes';
import type { Character } from '@/domain/character';
import { m } from '@/i18n';

export interface CharacterOutletContext {
  character: Character;
}

/** Il personaggio della rotta corrente; usabile solo nelle pagine sotto /pg/:charId. */
export function useCurrentCharacter(): Character {
  return useOutletContext<CharacterOutletContext>().character;
}

/** "Guerriero 3 / Mago 2", oppure "Senza classe". */
export function classSummary(c: Character): string {
  if (c.classes.length === 0) return m.app.switcher.noClass;
  return c.classes.map((cl) => `${canonicalClass(cl.name)} ${cl.level}`).join(' / ');
}
