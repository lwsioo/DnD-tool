import { newId } from '@/lib/id';
import { normalizeKey } from '@/lib/normalizeKey';
import { ABILITIES, SKILLS, type Ability, type ProfLevel, type SkillKey } from './abilities';
import { CHARACTER_SCHEMA_VERSION, type Character } from './character';
import type { ID } from './primitives';
import type { Campaign, WikiCategory, WikiEntry, WikiMetaFor } from './wiki';

const mapKeys = <K extends string, V>(keys: readonly K[], value: () => V): Record<K, V> =>
  Object.fromEntries(keys.map((k) => [k, value()])) as Record<K, V>;

/** Personaggio vuoto e valido: punteggi a 10, nessuna classe, nessuna competenza. */
export function createBlankCharacter(name = 'Nuovo personaggio', now = Date.now()): Character {
  return {
    id: newId(),
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    campaignId: null,
    createdAt: now,
    updatedAt: now,
    identity: { name, species: '', size: 'M', background: '', xp: 0 },
    classes: [],
    abilities: mapKeys<Ability, { base: number; bonus: number }>(ABILITIES, () => ({ base: 10, bonus: 0 })),
    saves: mapKeys<Ability, ProfLevel>(ABILITIES, () => 0),
    skills: mapKeys<SkillKey, { prof: ProfLevel }>(SKILLS, () => ({ prof: 0 })),
    proficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    weaponMasteries: [],
    combat: {
      hp: { current: 0, temp: 0, maxMode: 'manual', maxManual: 0 },
      hitDice: {},
      deathSaves: { successes: 0, failures: 0 },
      exhaustion: 0,
      heroicInspiration: false,
      speed: { walk: 30 },
      conditions: [],
    },
    features: [],
    spellcasting: { sources: [], slots: { used: Array(9).fill(0) }, spells: [] },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    settings: { heroicInspirationOnLongRest: false, clearTempHpOnLongRest: true, encumbranceRule: 'off' },
    notes: '',
  };
}

export function createCampaign(name: string, now = Date.now()): Campaign {
  return { id: newId(), name, createdAt: now, updatedAt: now };
}

const DEFAULT_META: { [C in WikiCategory]: () => WikiMetaFor<C> } = {
  npc: () => ({ factionIds: [], status: 'unknown', attitude: 'unknown' }),
  location: () => ({ factionIds: [] }),
  faction: () => ({ leaderIds: [] }),
  religion: () => ({ domains: [] }),
  session: () => ({ number: 1, date: new Date().toISOString().slice(0, 10), participantIds: [] }),
};

export function createWikiEntry<C extends WikiCategory>(
  campaignId: ID,
  category: C,
  title: string,
  meta?: Partial<WikiMetaFor<C>>,
  now = Date.now(),
): Extract<WikiEntry, { category: C }> {
  return {
    id: newId(),
    campaignId,
    category,
    title,
    titleKey: normalizeKey(title),
    aliases: [],
    aliasKeys: [],
    body: '',
    tags: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
    meta: { ...DEFAULT_META[category](), ...meta },
  } as unknown as Extract<WikiEntry, { category: C }>;
}
