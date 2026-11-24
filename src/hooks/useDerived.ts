import { useMemo } from 'react';
import { SRD_DERIVE_CONTEXT } from '@/data/srd';
import type { Character } from '@/domain/character';
import { deriveCharacter, type DerivedCharacter } from '@/engine/derive';

/** Valori derivati del personaggio (con gli effetti delle condizioni SRD), ricalcolati solo quando il documento cambia. */
export function useDerived(character: Character): DerivedCharacter;
export function useDerived(character: Character | undefined): DerivedCharacter | undefined;
export function useDerived(character: Character | undefined): DerivedCharacter | undefined {
  return useMemo(() => (character ? deriveCharacter(character, SRD_DERIVE_CONTEXT) : undefined), [character]);
}
