import { z } from 'zod';
import itLocale from 'zod/v4/locales/it.js';
import { ABILITIES, SKILLS, type Ability, type SkillKey } from '@/domain/abilities';
import type { Character } from '@/domain/character';
import type { EffectTarget } from '@/domain/effects';
import type { LibraryItem, SettingRecord } from '@/domain/library';
import type { Spell } from '@/domain/spells';
import type { Campaign, WikiEntry } from '@/domain/wiki';
import { m as msg } from '@/i18n';

/**
 * Schemi di validazione per i file importati. Sono volutamente "tolleranti":
 * i campi opzionali o aggiunti in versioni successive hanno un valore predefinito,
 * così un file un po' vecchio o scritto a mano si importa comunque.
 * In fondo al file, controlli di tipo garantiscono che gli schemi restino allineati ai tipi del dominio.
 */

// Solo la lingua italiana (importare z.locales includerebbe tutte le lingue nel bundle).
z.config(itLocale());

const id = z.string().min(1);
const int = z.number().int();
const nonNeg = z.number().int().min(0);
const timestamps = { createdAt: z.number(), updatedAt: z.number() };

const ability = z.enum(ABILITIES);
const profLevel = z.literal([0, 0.5, 1, 2]);
const die = z.literal([4, 6, 8, 10, 12, 20]);
const damageType = z.enum([
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
]);

const EFFECT_TARGETS = new Set<string>([
  'ac',
  'ac.formula',
  'initiative',
  'speed',
  'hp.max',
  'passive.perception',
  'save.all',
  'attack.all',
  'attack.melee',
  'attack.ranged',
  'damage.melee',
  'damage.ranged',
  'spell.dc',
  'spell.attack',
  'd20.all',
  ...ABILITIES.flatMap((a) => [`score.${a}`, `save.${a}`, `check.${a}`]),
  ...SKILLS.map((s) => `skill.${s}`),
]);

export const effectSchema = z.object({
  id,
  target: z.custom<EffectTarget>((v) => typeof v === 'string' && EFFECT_TARGETS.has(v), {
    message: msg.misc.db.badTarget,
  }),
  op: z.enum(['add', 'set', 'formula', 'advantage', 'disadvantage', 'proficiency', 'expertise']),
  value: z.string().optional(),
  requires: z.array(z.enum(['noArmor', 'noShield', 'armorEquipped', 'shieldEquipped'])).optional(),
  note: z.string().optional(),
});

const rechargeAmount = z.union([z.literal('all'), nonNeg]);
export const usesSchema = z.object({
  max: z.string(),
  used: nonNeg,
  recharge: z.object({ shortRest: rechargeAmount, longRest: rechargeAmount }),
  pinned: z.boolean().default(false),
});

const simpleProperty = z.enum([
  'ammunition',
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'twoHanded',
  'versatile',
]);
const weaponProperty = z.union([
  z.object({ key: z.enum(['range', 'thrown']), normal: nonNeg, long: nonNeg }),
  z.object({ key: simpleProperty }),
]);

const weaponSchema = z.object({
  baseId: z.string().optional(),
  category: z.enum(['simple', 'martial']),
  type: z.enum(['melee', 'ranged']),
  damage: z.object({ dice: z.string(), type: damageType }),
  versatileDice: z.string().optional(),
  properties: z.array(weaponProperty).default([]),
  mastery: z.enum(['cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex']).optional(),
  magicBonus: int.default(0),
  abilityOverride: ability.optional(),
  hand: z.enum(['main', 'off', 'two']).default('main'),
  ammoItemId: z.string().optional(),
});

const armorSchema = z.object({
  category: z.enum(['light', 'medium', 'heavy']),
  baseAc: int,
  dexCap: int.nullable(),
  strRequirement: int.optional(),
  stealthDisadvantage: z.boolean().default(false),
  magicBonus: int.default(0),
});

const itemFields = {
  kind: z.enum([
    'weapon',
    'armor',
    'shield',
    'focus',
    'gear',
    'container',
    'consumable',
    'tool',
    'treasure',
    'ammunition',
  ]),
  name: z.string(),
  quantity: nonNeg.default(1),
  weightLb: z.number().min(0).optional(),
  valueCp: nonNeg.optional(),
  attunement: z.enum(['none', 'required', 'attuned']).optional(),
  description: z.string().optional(),
  effects: z.array(effectSchema).default([]),
  weapon: weaponSchema.optional(),
  armor: armorSchema.optional(),
  shield: z.object({ acBonus: int }).optional(),
  container: z
    .object({
      capacityLb: z.number().min(0).optional(),
      weightless: z.boolean().default(false),
      collapsed: z.boolean().default(false),
    })
    .optional(),
  libraryRef: z.string().optional(),
};

export const inventoryItemSchema = z.object({
  id,
  parentId: z.string().nullable().default(null),
  equipped: z.boolean().default(false),
  ...itemFields,
});

const featureFields = {
  category: z.enum(['class', 'subclass', 'species', 'background', 'feat', 'other']),
  name: z.string(),
  origin: z.string().optional(),
  description: z.string().default(''),
  uses: usesSchema.optional(),
  effects: z.array(effectSchema).default([]),
  toggleable: z.boolean().default(false),
  active: z.boolean().default(true),
  libraryRef: z.string().optional(),
};
export const featureSchema = z.object({ id, ...featureFields });

// ── Origini: specie, background, talenti ────────────────────────────────────────────────
const recharge = z.object({ shortRest: rechargeAmount, longRest: rechargeAmount });
const effectTemplate = effectSchema.omit({ id: true });
const traitSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  effects: z.array(effectTemplate).optional(),
  uses: z.object({ max: z.string(), recharge }).optional(),
  minLevel: int.min(1).max(20).optional(),
  toggleable: z.boolean().optional(),
});
const contentOrigin = z.enum(['srd', 'import', 'custom']);
const sizeSchema = z.enum(['S', 'M', 'L']);
const skillSchema = z.enum(SKILLS as [SkillKey, ...SkillKey[]]);

export const speciesDefSchema = z.object({
  id,
  name: z.string().min(1),
  nameEn: z.string().optional(),
  origin: contentOrigin,
  sourceBook: z.string().optional(),
  sizes: z.array(sizeSchema).min(1),
  speed: nonNeg,
  darkvision: nonNeg.optional(),
  traits: z.array(traitSchema).default([]),
  choice: z
    .object({
      label: z.string(),
      options: z.array(
        z.object({
          key: z.string(),
          name: z.string(),
          traits: z.array(traitSchema).default([]),
          speed: nonNeg.optional(),
          grantsSpells: z.boolean().optional(),
        }),
      ),
    })
    .optional(),
  skills: z.array(skillSchema).optional(),
  skillChoice: z.object({ count: nonNeg, from: z.array(skillSchema).optional() }).optional(),
  originFeat: z.boolean().optional(),
  heroicInspiration: z.boolean().optional(),
  description: z.string().optional(),
});

export const backgroundDefSchema = z.object({
  id,
  name: z.string().min(1),
  nameEn: z.string().optional(),
  origin: contentOrigin,
  sourceBook: z.string().optional(),
  abilities: z.array(ability).max(6),
  featId: z.string().optional(),
  featName: z.string().optional(),
  skills: z.array(skillSchema).default([]),
  tools: z.array(z.string()).default([]),
  equipment: z
    .array(
      z.object({
        name: z.string(),
        quantity: nonNeg,
        weaponId: z.string().optional(),
        weightLb: z.number().min(0).optional(),
      }),
    )
    .default([]),
  equipmentGoldInA: nonNeg.default(0),
  equipmentGold: nonNeg.default(50),
  description: z.string().optional(),
});

export const featDefSchema = z.object({
  id,
  name: z.string().min(1),
  nameEn: z.string().optional(),
  origin: contentOrigin,
  sourceBook: z.string().optional(),
  category: z.enum(['origin', 'general', 'fightingStyle', 'epic', 'other']),
  prerequisite: z.string().optional(),
  description: z.string().default(''),
  effects: z.array(effectTemplate).optional(),
  uses: z.object({ max: z.string(), recharge }).optional(),
  skillChoices: nonNeg.optional(),
  spellLists: z.array(z.string()).optional(),
  repeatable: z.boolean().optional(),
});

const grantsSchema = z.object({
  skills: z.array(skillSchema).default([]),
  tools: z.array(z.string()).default([]),
  abilityBonus: z.partialRecord(ability, int).default({}),
  featureIds: z.array(z.string()).default([]),
  spellSourceIds: z.array(z.string()).default([]),
  heroicInspiration: z.boolean().default(false),
});
const emptyGrantsValue = {
  skills: [],
  tools: [],
  abilityBonus: {},
  featureIds: [],
  spellSourceIds: [],
  heroicInspiration: false,
};

export const originStateSchema = z.object({
  speciesId: z.string().optional(),
  speciesOption: z.string().optional(),
  backgroundId: z.string().optional(),
  species: grantsSchema.default(emptyGrantsValue),
  background: grantsSchema.default(emptyGrantsValue),
});

const zero9 = () => Array<number>(9).fill(0);

export const characterSchema = z.object({
  id,
  schemaVersion: int.min(1),
  campaignId: z.string().nullable().default(null),
  ...timestamps,
  identity: z.object({
    name: z.string(),
    playerName: z.string().optional(),
    portrait: z.string().optional(),
    species: z.string().default(''),
    size: z.enum(['S', 'M', 'L']).default('M'),
    background: z.string().default(''),
    alignment: z.string().optional(),
    deity: z.string().optional(),
    xp: nonNeg.default(0),
    appearance: z.string().optional(),
    backstory: z.string().optional(),
  }),
  classes: z
    .array(
      z.object({
        id,
        classKey: z.string(),
        name: z.string(),
        subclass: z.string().optional(),
        level: int.min(1).max(20),
        hitDie: die,
        caster: z.enum(['none', 'full', 'half', 'third', 'pact']),
        hpRolls: z.array(nonNeg).optional(),
      }),
    )
    .default([]),
  abilities: z.record(ability, z.object({ base: int.min(1).max(30), bonus: int.default(0) })),
  saves: z.record(ability, profLevel),
  skills: z.record(
    z.enum(SKILLS as [SkillKey, ...SkillKey[]]),
    z.object({ prof: profLevel, abilityOverride: ability.optional() }),
  ),
  proficiencies: z.object({
    armor: z.array(z.enum(['light', 'medium', 'heavy', 'shield'])).default([]),
    weapons: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
  }),
  weaponMasteries: z.array(z.string()).default([]),
  combat: z.object({
    hp: z.object({
      current: nonNeg,
      temp: nonNeg.default(0),
      maxMode: z.enum(['auto', 'manual']),
      maxManual: nonNeg.optional(),
    }),
    hitDice: z
      .partialRecord(z.enum(['4', '6', '8', '10', '12', '20']), z.object({ spent: nonNeg }))
      .default({}),
    deathSaves: z
      .object({ successes: z.literal([0, 1, 2, 3]), failures: z.literal([0, 1, 2, 3]) })
      .default({ successes: 0, failures: 0 }),
    exhaustion: z.literal([0, 1, 2, 3, 4, 5, 6]).default(0),
    heroicInspiration: z.boolean().default(false),
    speed: z.object({
      walk: nonNeg,
      fly: nonNeg.optional(),
      swim: nonNeg.optional(),
      climb: nonNeg.optional(),
      burrow: nonNeg.optional(),
    }),
    conditions: z.array(z.string()).default([]),
    concentration: z.object({ characterSpellId: id, since: z.number() }).optional(),
    acOverride: int.optional(),
  }),
  features: z.array(featureSchema).default([]),
  spellcasting: z
    .object({
      sources: z
        .array(
          z.object({
            id,
            label: z.string(),
            ability,
            classEntryId: z.string().optional(),
            preparedMax: z.string().optional(),
          }),
        )
        .default([]),
      slots: z
        .object({
          used: z.array(nonNeg).length(9).default(zero9),
          maxOverride: z.array(nonNeg.nullable()).length(9).optional(),
        })
        .default({ used: zero9() }),
      pact: z.object({ used: nonNeg }).optional(),
      spells: z
        .array(
          z.object({
            id,
            spellId: id,
            sourceId: z.string(),
            status: z.enum(['known', 'prepared', 'alwaysPrepared', 'free']),
            freeUses: usesSchema.optional(),
            freeCastLevel: int.min(1).max(9).optional(),
            notes: z.string().optional(),
          }),
        )
        .default([]),
    })
    .default({ sources: [], slots: { used: zero9() }, spells: [] }),
  inventory: z
    .object({
      currency: z
        .object({
          cp: nonNeg.default(0),
          sp: nonNeg.default(0),
          ep: nonNeg.default(0),
          gp: nonNeg.default(0),
          pp: nonNeg.default(0),
        })
        .default({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }),
      items: z.array(inventoryItemSchema).default([]),
    })
    .default({ currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] }),
  settings: z
    .object({
      heroicInspirationOnLongRest: z.boolean().default(false),
      clearTempHpOnLongRest: z.boolean().default(true),
      encumbranceRule: z.enum(['off', 'standard', 'variant']).default('off'),
    })
    .default({ heroicInspirationOnLongRest: false, clearTempHpOnLongRest: true, encumbranceRule: 'off' }),
  notes: z.string().default(''),
  origin: originStateSchema.optional(),
});

export const spellSchema = z.object({
  id,
  ...timestamps,
  origin: z.enum(['srd', 'custom', 'import']),
  sourceBook: z.string().optional(),
  name: z.string().min(1),
  nameKey: z.string(),
  nameEn: z.string().optional(),
  level: z.literal([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
  school: z.enum([
    'abjuration',
    'conjuration',
    'divination',
    'enchantment',
    'evocation',
    'illusion',
    'necromancy',
    'transmutation',
  ]),
  castingTime: z.object({
    amount: nonNeg,
    unit: z.enum(['action', 'bonus', 'reaction', 'minute', 'hour']),
    condition: z.string().optional(),
  }),
  ritual: z.boolean().default(false),
  range: z.object({
    kind: z.enum(['self', 'touch', 'distance', 'sight', 'unlimited', 'special']),
    distance: nonNeg.optional(),
    area: z
      .object({
        shape: z.enum(['cone', 'cube', 'cylinder', 'line', 'sphere', 'emanation']),
        size: nonNeg,
      })
      .optional(),
  }),
  components: z.object({
    v: z.boolean(),
    s: z.boolean(),
    m: z.boolean(),
    material: z.string().optional(),
    costGp: z.number().min(0).optional(),
    consumed: z.boolean().optional(),
  }),
  duration: z.object({
    kind: z.enum(['instant', 'timed', 'untilDispelled', 'special']),
    amount: nonNeg.optional(),
    unit: z.enum(['round', 'minute', 'hour', 'day']).optional(),
    concentration: z.boolean().default(false),
  }),
  description: z.string().default(''),
  higherLevels: z.string().optional(),
  scaling: z
    .object({
      cantrip: z.tuple([z.string(), z.string(), z.string(), z.string()]).optional(),
      perSlot: z.string().optional(),
    })
    .optional(),
  classes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  save: ability.optional(),
  attack: z.enum(['melee', 'ranged']).optional(),
  damageTypes: z.array(damageType).optional(),
});

export const campaignSchema = z.object({
  id,
  name: z.string(),
  description: z.string().optional(),
  ...timestamps,
});

const wikiBase = {
  id,
  campaignId: id,
  title: z.string().min(1),
  titleKey: z.string(),
  aliases: z.array(z.string()).default([]),
  aliasKeys: z.array(z.string()).default([]),
  body: z.string().default(''),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  image: z.string().optional(),
  ...timestamps,
};
const ids = z.array(z.string()).default([]);

export const wikiEntrySchema = z.discriminatedUnion('category', [
  z.object({
    ...wikiBase,
    category: z.literal('npc'),
    meta: z.object({
      factionIds: ids,
      locationId: z.string().optional(),
      status: z.enum(['alive', 'dead', 'unknown']).default('unknown'),
      attitude: z.enum(['ally', 'friendly', 'neutral', 'hostile', 'unknown']).default('unknown'),
      role: z.string().optional(),
      species: z.string().optional(),
    }),
  }),
  z.object({
    ...wikiBase,
    category: z.literal('location'),
    meta: z.object({
      region: z.string().optional(),
      parentLocationId: z.string().optional(),
      factionIds: ids,
      locationType: z.string().optional(),
    }),
  }),
  z.object({
    ...wikiBase,
    category: z.literal('faction'),
    meta: z.object({
      leaderIds: ids,
      headquartersId: z.string().optional(),
      religionId: z.string().optional(),
      goals: z.string().optional(),
      attitude: z.string().optional(),
    }),
  }),
  z.object({
    ...wikiBase,
    category: z.literal('religion'),
    meta: z.object({
      deity: z.string().optional(),
      domains: z.array(z.string()).default([]),
      symbol: z.string().optional(),
      alignment: z.string().optional(),
    }),
  }),
  z.object({
    ...wikiBase,
    category: z.literal('session'),
    meta: z.object({
      number: nonNeg,
      date: z.string(),
      inGameDate: z.string().optional(),
      participantIds: ids,
    }),
  }),
]);

const {
  id: _itemId,
  parentId: _parentId,
  equipped: _equipped,
  ...itemTemplateShape
} = inventoryItemSchema.shape;
const { id: _featureId, ...featureTemplateShape } = featureSchema.shape;

export const libraryItemSchema = z.discriminatedUnion('kind', [
  z.object({
    id,
    nameKey: z.string(),
    ...timestamps,
    kind: z.literal('item'),
    data: z.object({
      ...itemTemplateShape,
      rarity: z.string().optional(),
      sourceBook: z.string().optional(),
    }),
  }),
  z.object({
    id,
    nameKey: z.string(),
    ...timestamps,
    kind: z.literal('feature'),
    data: z.object(featureTemplateShape),
  }),
  z.object({ id, nameKey: z.string(), ...timestamps, kind: z.literal('species'), data: speciesDefSchema }),
  z.object({
    id,
    nameKey: z.string(),
    ...timestamps,
    kind: z.literal('background'),
    data: backgroundDefSchema,
  }),
  z.object({ id, nameKey: z.string(), ...timestamps, kind: z.literal('feat'), data: featDefSchema }),
]);

export const settingRecordSchema = z.object({ key: z.string().min(1), value: z.unknown() });

const envelope = {
  format: z.literal('codex-dnd'),
  schemaVersion: int.min(1),
  appVersion: z.string().default('sconosciuta'),
  exportedAt: z.string().default(''),
};

export const characterExportSchema = z.object({
  ...envelope,
  kind: z.literal('character'),
  data: z.object({ character: characterSchema, spells: z.array(spellSchema).default([]) }),
});

export const fullBackupSchema = z.object({
  ...envelope,
  kind: z.literal('fullBackup'),
  data: z.object({
    campaigns: z.array(campaignSchema).default([]),
    characters: z.array(characterSchema).default([]),
    spells: z.array(spellSchema).default([]),
    libraryItems: z.array(libraryItemSchema).default([]),
    wikiEntries: z.array(wikiEntrySchema).default([]),
    settings: z.array(settingRecordSchema).default([]),
  }),
});

/** Pacchetto di contenuti da condividere: libreria incantesimi, specie, background, talenti, oggetti. */
export const libraryPackSchema = z.object({
  ...envelope,
  kind: z.literal('library'),
  data: z.object({
    spells: z.array(spellSchema).default([]),
    libraryItems: z.array(libraryItemSchema).default([]),
  }),
});

export const exportFileSchema = z.discriminatedUnion('kind', [
  characterExportSchema,
  fullBackupSchema,
  libraryPackSchema,
]);

// ── Allineamento schemi ⇄ tipi del dominio (errore di compilazione se divergono) ──────────────
type Assert<T extends true> = T;
type Extends<A, B> = [A] extends [B] ? true : false;
export type SchemaChecks = [
  Assert<Extends<z.output<typeof characterSchema>, Character>>,
  Assert<Extends<Character, z.input<typeof characterSchema>>>,
  Assert<Extends<z.output<typeof spellSchema>, Spell>>,
  Assert<Extends<Spell, z.input<typeof spellSchema>>>,
  Assert<Extends<z.output<typeof campaignSchema>, Campaign>>,
  Assert<Extends<z.output<typeof wikiEntrySchema>, WikiEntry>>,
  Assert<Extends<WikiEntry, z.input<typeof wikiEntrySchema>>>,
  Assert<Extends<z.output<typeof libraryItemSchema>, LibraryItem>>,
  Assert<Extends<z.output<typeof settingRecordSchema>, SettingRecord>>,
  Assert<Extends<Ability, z.output<typeof ability>>>,
];
