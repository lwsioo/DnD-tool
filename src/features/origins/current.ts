import type { Ability } from '@/domain/abilities';
import type { Character } from '@/domain/character';
import type { BackgroundValue, SpeciesValue } from './OriginFields';

/** Ricostruisce le scelte attuali della specie a partire da ciò che è registrato sulla scheda. */
export function currentSpecies(c: Character): SpeciesValue {
  const o = c.origin;
  const g = o?.species;
  const feat = c.features.find((f) => g?.featureIds.includes(f.id) && f.category === 'feat');
  const source = c.spellcasting.sources.find((s) => g?.spellSourceIds.includes(s.id));
  return {
    speciesId: o?.speciesId ?? '',
    customName: c.identity.species,
    choices: {
      optionKey: o?.speciesOption,
      size: c.identity.size,
      skills: g?.skills,
      spellAbility: source?.ability,
      featId: feat?.libraryRef,
      feat: { spellAbility: source?.ability },
    },
  };
}

export function currentBackground(c: Character): BackgroundValue & {
  mode: 'twoOne' | 'threeOnes';
  picks: Ability[];
} {
  const o = c.origin;
  const bonus = Object.entries(o?.background.abilityBonus ?? {}) as Array<[Ability, number]>;
  const mode = bonus.some(([, v]) => v === 2) || bonus.length === 0 ? 'twoOne' : 'threeOnes';
  const picks = bonus.sort((a, b) => b[1] - a[1]).map(([a]) => a);
  const source = c.spellcasting.sources.find((s) => o?.background.spellSourceIds.includes(s.id));
  return {
    backgroundId: o?.backgroundId ?? '',
    customName: c.identity.background,
    feat: { spellAbility: source?.ability, skills: o?.background.skills },
    mode,
    picks,
  };
}
