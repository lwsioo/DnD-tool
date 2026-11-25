import { pick } from '@/i18n/locale';
/** Lingue standard e rare (SRD 5.2). */
const STANDARD_IT = [
  'Comune',
  'Linguaggio dei Segni Comune',
  'Draconico',
  'Elfico',
  'Gigante',
  'Gnomesco',
  'Goblin',
  'Halfling',
  'Nanico',
  'Orchesco',
] as const;

const RARE_IT = [
  'Abissale',
  'Celestiale',
  'Druidico',
  'Gergo dei Ladri',
  'Gergo delle Profondità',
  'Infernale',
  'Primordiale',
  'Silvano',
  'Sottocomune',
] as const;

/** Lingue standard e rare nella lingua attiva. */
export const STANDARD_LANGUAGES: readonly string[] = pick<readonly string[]>(STANDARD_IT, [
  'Common',
  'Common Sign Language',
  'Draconic',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Dwarvish',
  'Orc',
]);

export const RARE_LANGUAGES: readonly string[] = pick<readonly string[]>(RARE_IT, [
  'Abyssal',
  'Celestial',
  'Druidic',
  "Thieves' Cant",
  'Deep Speech',
  'Infernal',
  'Primordial',
  'Sylvan',
  'Undercommon',
]);

const DAMAGE_TYPE_LABELS_IT = {
  acid: 'acido',
  bludgeoning: 'contundente',
  cold: 'freddo',
  fire: 'fuoco',
  force: 'forza',
  lightning: 'fulmine',
  necrotic: 'necrotico',
  piercing: 'perforante',
  poison: 'veleno',
  psychic: 'psichico',
  radiant: 'radioso',
  slashing: 'tagliente',
  thunder: 'tuono',
} as const;

export const DAMAGE_TYPE_LABELS: Record<keyof typeof DAMAGE_TYPE_LABELS_IT, string> = pick<
  Record<keyof typeof DAMAGE_TYPE_LABELS_IT, string>
>(DAMAGE_TYPE_LABELS_IT, {
  acid: 'acid',
  bludgeoning: 'bludgeoning',
  cold: 'cold',
  fire: 'fire',
  force: 'force',
  lightning: 'lightning',
  necrotic: 'necrotic',
  piercing: 'piercing',
  poison: 'poison',
  psychic: 'psychic',
  radiant: 'radiant',
  slashing: 'slashing',
  thunder: 'thunder',
});
