/** Lingue standard e rare (SRD 5.2). */
export const STANDARD_LANGUAGES = [
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

export const RARE_LANGUAGES = [
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

export const DAMAGE_TYPE_LABELS = {
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
