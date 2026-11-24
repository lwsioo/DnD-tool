import { ARMOR } from '@/data/srd/armor';
import { CLASSES } from '@/data/srd/classes';
import { WEAPON_MASTERIES } from '@/data/srd/weaponMasteries';
import { WEAPONS, weaponDataFromBase } from '@/data/srd/weapons';
import { ABILITIES, SKILLS, type Ability, type SkillKey } from '@/domain/abilities';
import type { Effect } from '@/domain/effects';
import type { ItemKind, MasteryKey, WeaponData, WeaponPropertyRef } from '@/domain/items';
import type { ItemTemplate, LibraryItem } from '@/domain/library';
import type {
  BackgroundDef,
  EquipmentLine,
  FeatCategory,
  FeatDef,
  OriginTrait,
  SpeciesDef,
} from '@/domain/origins';
import type { DamageType } from '@/domain/primitives';
import type { Spell } from '@/domain/spells';
import { convertFiveEtoolsSpell, entriesToMarkdown } from '@/features/grimoire/import/fiveEtools';
import { newId } from '@/lib/id';
import { normalizeKey } from '@/lib/normalizeKey';

/**
 * Conversione dei file JSON di 5etools (specie, background, talenti, oggetti, incantesimi)
 * nei modelli della libreria. Gli id sono deterministici (nome + fonte), così reimportare lo
 * stesso file non crea doppioni. Testi e nomi restano in inglese come nel file.
 */

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};
/** "spear|xphb" → "spear". */
const bare = (s: string) => s.split('|')[0]!.trim();
/** Maiuscola a inizio parola ("calligrapher's supplies" → "Calligrapher's Supplies"). */
const titleCase = (s: string) =>
  s.replace(/(^|[\s(-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
const slug = (s: string) =>
  normalizeKey(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const stableId = (kind: string, name: string, source?: string) =>
  `5e-${kind}-${slug(name)}${source ? `-${slug(source)}` : ''}`;
/** "+1" → 1. */
const bonus = (v: unknown) => num(typeof v === 'string' ? v.replace('+', '') : v) ?? 0;

const SKILL_BY_EN = new Map<string, SkillKey>(
  SKILLS.map((k) => [k.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`), k]),
);
const CLASS_BY_EN = new Map(CLASSES.map((c) => [c.nameEn.toLowerCase(), c.name]));
const WEAPON_BY_EN = new Map(WEAPONS.map((w) => [w.nameEn.toLowerCase(), w]));
const ARMOR_BY_EN = new Map(ARMOR.map((a) => [a.nameEn.toLowerCase(), a]));
const MASTERIES = new Set(Object.keys(WEAPON_MASTERIES));
const DAMAGE: Record<string, DamageType> = { B: 'bludgeoning', P: 'piercing', S: 'slashing' };

const SKIP_TRAITS = new Set(['age', 'size', 'speed', 'creature type', 'languages', 'alignment']);

function traitsFrom(entries: unknown): OriginTrait[] {
  return arr(entries)
    .filter((e): e is Json => isObj(e) && typeof e.name === 'string')
    .filter((e) => !SKIP_TRAITS.has(String(e.name).toLowerCase()))
    .map((e) => ({ name: String(e.name), description: entriesToMarkdown(e.entries) }));
}

/** Competenze: [{ athletics: true }] fisse, oppure { choose: { from, count } } / { any: n }. */
function skillsFrom(raw: unknown): { fixed: SkillKey[]; choice?: { count: number; from?: SkillKey[] } } {
  const fixed: SkillKey[] = [];
  let choice: { count: number; from?: SkillKey[] } | undefined;
  const first = arr(raw)[0];
  if (!isObj(first)) return { fixed };
  for (const [k, v] of Object.entries(first)) {
    const skill = SKILL_BY_EN.get(k.toLowerCase());
    if (skill && v === true) fixed.push(skill);
    if (k === 'any') choice = { count: num(v) ?? 1 };
    if (k === 'choose' && isObj(v)) {
      const from = arr(v.from)
        .map((s) => SKILL_BY_EN.get(String(s).toLowerCase()))
        .filter((s): s is SkillKey => !!s);
      choice = { count: num(v.count) ?? 1, from: from.length ? from : undefined };
    }
  }
  return { fixed, choice };
}

export function convertRace(raw: unknown): SpeciesDef | null {
  if (!isObj(raw) || raw._copy) return null;
  const name = str(raw.name);
  if (!name) return null;
  const source = str(raw.source);
  const sizes = arr(raw.size).flatMap((s) => (s === 'V' ? ['S', 'M'] : [s]));
  const validSizes = [
    ...new Set(sizes.filter((s): s is 'S' | 'M' | 'L' => s === 'S' || s === 'M' || s === 'L')),
  ];
  const speed = num(raw.speed) ?? (isObj(raw.speed) ? num(raw.speed.walk) : undefined) ?? 30;
  const skills = skillsFrom(raw.skillProficiencies);
  const feats = arr(raw.feats);
  return {
    id: stableId('race', name, source),
    name,
    nameEn: name,
    origin: 'import',
    sourceBook: source,
    sizes: validSizes.length ? validSizes : ['M'],
    speed,
    darkvision: num(raw.darkvision),
    traits: traitsFrom(raw.entries),
    skills: skills.fixed.length ? skills.fixed : undefined,
    skillChoice: skills.choice,
    originFeat: feats.length > 0 || undefined,
  };
}

/** Nome leggibile di un talento citato come "magic initiate; cleric|xphb". */
function featReference(key: string): { base: string; variant?: string } {
  const [base = '', variant] = bare(key)
    .split(';')
    .map((s) => s.trim());
  return { base, variant };
}

const TOOL_ANY: Record<string, string> = {
  anyArtisansTool: 'Strumenti da artigiano (a scelta)',
  anyGamingSet: 'Set da gioco (a scelta)',
  anyMusicalInstrument: 'Strumento musicale (a scelta)',
};

function equipmentLine(e: unknown): EquipmentLine | { gold: number } | null {
  if (typeof e === 'string') {
    const n = bare(e);
    const weapon = WEAPON_BY_EN.get(n.toLowerCase());
    return { name: titleCase(n), quantity: 1, weaponId: weapon?.id };
  }
  if (!isObj(e)) return null;
  if (num(e.value) !== undefined && !e.item && !e.special) return { gold: Math.floor(num(e.value)! / 100) };
  const n = str(e.item) ? bare(String(e.item)) : str(e.special);
  if (!n) return null;
  const weapon = WEAPON_BY_EN.get(n.toLowerCase());
  return {
    name: str(e.displayName) ?? (e.item ? titleCase(n) : n),
    quantity: num(e.quantity) ?? 1,
    weaponId: weapon?.id,
  };
}

export function convertBackground(
  raw: unknown,
  findFeat: (nameEn: string) => FeatDef | undefined = () => undefined,
): BackgroundDef | null {
  if (!isObj(raw) || raw._copy) return null;
  const name = str(raw.name);
  if (!name) return null;
  const source = str(raw.source);

  const ab = arr(raw.ability)[0];
  const choose = isObj(ab) && isObj(ab.choose) ? ab.choose : undefined;
  const from = choose ? arr(isObj(choose.weighted) ? choose.weighted.from : choose.from) : [];
  const abilities = from.filter((a): a is Ability => ABILITIES.includes(a as Ability));

  let featId: string | undefined;
  let featName: string | undefined;
  const featKey = Object.keys(isObj(arr(raw.feats)[0]) ? (arr(raw.feats)[0] as Json) : {})[0];
  if (featKey) {
    const ref = featReference(featKey);
    const feat = findFeat(ref.base);
    const variant = ref.variant
      ? (CLASS_BY_EN.get(ref.variant.toLowerCase()) ?? titleCase(ref.variant))
      : undefined;
    featId = feat?.id;
    featName = `${feat?.name ?? titleCase(ref.base)}${variant ? ` (${variant})` : ''}`;
  }

  const tools: string[] = [];
  const toolRaw = arr(raw.toolProficiencies)[0];
  if (isObj(toolRaw)) {
    for (const [k, v] of Object.entries(toolRaw)) {
      if (TOOL_ANY[k]) tools.push(TOOL_ANY[k]);
      else if (v === true) tools.push(titleCase(bare(k)));
    }
  }

  const equipment: EquipmentLine[] = [];
  let goldA = 0;
  let goldB = 50;
  const eq = arr(raw.startingEquipment)[0];
  if (isObj(eq)) {
    for (const e of arr(eq.A ?? eq.a ?? eq._)) {
      const line = equipmentLine(e);
      if (line && 'gold' in line) goldA += line.gold;
      else if (line) equipment.push(line);
    }
    const b = arr(eq.B ?? eq.b).map(equipmentLine);
    const gold = b.find((x): x is { gold: number } => !!x && 'gold' in x);
    if (gold) goldB = gold.gold;
  }

  return {
    id: stableId('background', name, source),
    name,
    nameEn: name,
    origin: 'import',
    sourceBook: source,
    abilities,
    featId,
    featName,
    skills: skillsFrom(raw.skillProficiencies).fixed,
    tools,
    equipment,
    equipmentGoldInA: goldA,
    equipmentGold: goldB,
    description: entriesToMarkdown(raw.entries) || undefined,
  };
}

const FEAT_CATEGORY: Record<string, FeatCategory> = {
  O: 'origin',
  G: 'general',
  FS: 'fightingStyle',
  EB: 'epic',
};

function prerequisiteText(raw: unknown): string | undefined {
  const parts = arr(raw).flatMap((p) => {
    if (!isObj(p)) return [];
    const out: string[] = [];
    const level = isObj(p.level) ? num(p.level.level) : num(p.level);
    if (level) out.push(`Livello ${level}+`);
    for (const a of arr(p.ability)) {
      if (isObj(a))
        out.push(
          Object.entries(a)
            .map(([k, v]) => `${k.toUpperCase()} ${v}+`)
            .join(' o '),
        );
    }
    if (p.spellcasting || p.spellcasting2020 || p.spellcastingFeature)
      out.push('Capacità di lanciare incantesimi');
    if (arr(p.feat).length)
      out.push(
        arr(p.feat)
          .map((f) => titleCase(bare(String(f))))
          .join(', '),
      );
    if (arr(p.proficiency).length) out.push('Competenza richiesta (vedi descrizione)');
    return out;
  });
  return parts.length ? parts.join('; ') : undefined;
}

/** Competenze a scelta di un talento: { any: 3 }, { anySkill: 3 } o { choose: [{ from: ['anySkill', …], count: 3 }] }. */
function featSkillCount(raw: Json): number {
  for (const key of ['skillProficiencies', 'skillToolLanguageProficiencies']) {
    const first = arr(raw[key])[0];
    if (!isObj(first)) continue;
    const direct = num(first.any) ?? num(first.anySkill);
    if (direct) return direct;
    const choices = isObj(first.choose) ? [first.choose] : arr(first.choose);
    for (const c of choices) if (isObj(c)) return num(c.count) ?? 1;
  }
  return 0;
}

export function convertFeat(raw: unknown): FeatDef | null {
  if (!isObj(raw) || raw._copy) return null;
  const name = str(raw.name);
  if (!name) return null;
  const source = str(raw.source);
  const cat = str(raw.category)?.replace(/:.*/, '') ?? '';
  const skillCount = featSkillCount(raw);
  const spellLists = arr(raw.additionalSpells)
    .map((s) => (isObj(s) ? str(s.name) : undefined))
    .map((n) => n?.replace(/ spells?$/i, '').toLowerCase())
    .map((n) => (n ? CLASS_BY_EN.get(n) : undefined))
    .filter((n): n is string => !!n);
  return {
    id: stableId('feat', name, source),
    name,
    nameEn: name,
    origin: 'import',
    sourceBook: source,
    category: FEAT_CATEGORY[cat] ?? (cat.startsWith('FS') ? 'fightingStyle' : 'other'),
    prerequisite: prerequisiteText(raw.prerequisite),
    description: entriesToMarkdown(raw.entries),
    skillChoices: skillCount || undefined,
    spellLists: spellLists.length ? [...new Set(spellLists)] : undefined,
    repeatable: raw.repeatable === true || undefined,
  };
}

const ITEM_KIND: Record<string, ItemKind> = {
  M: 'weapon',
  R: 'weapon',
  LA: 'armor',
  MA: 'armor',
  HA: 'armor',
  S: 'shield',
  A: 'ammunition',
  AF: 'ammunition',
  SCF: 'focus',
  AT: 'tool',
  GS: 'tool',
  INS: 'tool',
  T: 'tool',
  P: 'consumable',
  SC: 'consumable',
  FD: 'consumable',
  $: 'treasure',
  $A: 'treasure',
  $C: 'treasure',
  $G: 'treasure',
  TG: 'treasure',
};

const PROPERTY: Record<string, WeaponPropertyRef['key']> = {
  F: 'finesse',
  H: 'heavy',
  L: 'light',
  LD: 'loading',
  R: 'reach',
  '2H': 'twoHanded',
  V: 'versatile',
  A: 'ammunition',
  T: 'thrown',
};

function weaponFrom(raw: Json, code: string): WeaponData {
  const base = str(raw.baseItem) ? WEAPON_BY_EN.get(bare(String(raw.baseItem)).toLowerCase()) : undefined;
  const magicBonus = bonus(raw.bonusWeapon);
  if (base) return { ...weaponDataFromBase(base), magicBonus };
  const [normal = 0, long = 0] = (str(raw.range) ?? '').split('/').map(Number);
  const properties: WeaponPropertyRef[] = [];
  for (const p of arr(raw.property)) {
    const key = PROPERTY[bare(String(isObj(p) ? p.uid : p)).toUpperCase()];
    if (!key) continue;
    properties.push(key === 'thrown' ? { key, normal, long } : ({ key } as WeaponPropertyRef));
  }
  if (code === 'R' && normal) properties.push({ key: 'range', normal, long });
  const mastery = arr(raw.mastery)
    .map((m) => bare(String(m)).toLowerCase())
    .find((m) => MASTERIES.has(m)) as MasteryKey | undefined;
  return {
    category: str(raw.weaponCategory) === 'martial' ? 'martial' : 'simple',
    type: code === 'R' ? 'ranged' : 'melee',
    damage: { dice: str(raw.dmg1) ?? '1d4', type: DAMAGE[str(raw.dmgType) ?? ''] ?? 'bludgeoning' },
    versatileDice: str(raw.dmg2),
    properties,
    mastery,
    magicBonus,
    hand: properties.some((p) => p.key === 'twoHanded') ? 'two' : 'main',
  };
}

export function convertItem(raw: unknown): ItemTemplate | null {
  if (!isObj(raw) || raw._copy) return null;
  const name = str(raw.name);
  if (!name) return null;
  const code = bare(str(raw.type) ?? '');
  const isWeapon = code === 'M' || code === 'R' || raw.weapon === true;
  const kind: ItemKind = isWeapon
    ? 'weapon'
    : (ITEM_KIND[code] ?? (raw.containerCapacity ? 'container' : 'gear'));
  const rarity = str(raw.rarity);
  const effects: Effect[] = [];
  if (kind !== 'armor' && kind !== 'shield' && raw.bonusAc) {
    effects.push({ id: newId(), target: 'ac', op: 'add', value: String(bonus(raw.bonusAc)), note: name });
  }
  if (raw.bonusSavingThrow) {
    effects.push({
      id: newId(),
      target: 'save.all',
      op: 'add',
      value: String(bonus(raw.bonusSavingThrow)),
      note: name,
    });
  }
  if (raw.bonusSpellAttack) {
    effects.push({
      id: newId(),
      target: 'spell.attack',
      op: 'add',
      value: String(bonus(raw.bonusSpellAttack)),
      note: name,
    });
  }
  if (raw.bonusSpellSaveDc) {
    effects.push({
      id: newId(),
      target: 'spell.dc',
      op: 'add',
      value: String(bonus(raw.bonusSpellSaveDc)),
      note: name,
    });
  }

  const item: ItemTemplate = {
    kind,
    name,
    quantity: 1,
    weightLb: num(raw.weight),
    // Alcuni oggetti costano frazioni di rame (Sling Bullet: 0,2 mr): si arrotonda.
    valueCp: num(raw.value) === undefined ? undefined : Math.round(num(raw.value)!),
    attunement: raw.reqAttune ? 'required' : 'none',
    description: entriesToMarkdown(raw.entries) || undefined,
    effects,
    rarity: rarity && rarity !== 'none' ? rarity : undefined,
    sourceBook: str(raw.source),
  };

  if (kind === 'weapon') item.weapon = weaponFrom(raw, code === 'R' ? 'R' : 'M');
  if (kind === 'armor') {
    const base = str(raw.baseItem)
      ? ARMOR_BY_EN.get(bare(String(raw.baseItem)).toLowerCase())
      : ARMOR_BY_EN.get(name.toLowerCase());
    const category = code === 'HA' ? 'heavy' : code === 'MA' ? 'medium' : 'light';
    item.armor = {
      category: base && base.category !== 'shield' ? base.category : category,
      baseAc: base?.baseAc ?? num(raw.ac) ?? 10,
      dexCap: base ? base.dexCap : category === 'light' ? null : category === 'medium' ? 2 : 0,
      strRequirement: base?.strRequirement ?? num(raw.strength),
      stealthDisadvantage: base?.stealthDisadvantage ?? raw.stealth === true,
      magicBonus: bonus(raw.bonusAc),
    };
  }
  if (kind === 'shield') item.shield = { acBonus: (num(raw.ac) ?? 2) + bonus(raw.bonusAc) };
  if (kind === 'container') item.container = { weightless: false, collapsed: false };
  return item;
}

// ── File interi ─────────────────────────────────────────────────────────────────────────

export interface FiveEtoolsBundle {
  spells: Spell[];
  species: SpeciesDef[];
  backgrounds: BackgroundDef[];
  feats: FeatDef[];
  items: ItemTemplate[];
  /** Voci che rimandano ad altre (`_copy`) o incomplete. */
  skipped: number;
  /** Classi per incantesimo ("fonte|nome" in minuscolo), da file di lookup come `spells/sources.json`. */
  spellClasses: Map<string, string[]>;
}

const KEYS = ['spell', 'race', 'background', 'feat', 'item', 'baseitem'] as const;

export const spellLookupKey = (source: string | undefined, name: string) =>
  `${(source ?? '').toLowerCase()}|${name.toLowerCase()}`;

/** Nomi di classe da una voce `class` del lookup: array di { name } o { fonteClasse: { NomeClasse: true } }. */
function lookupClassNames(raw: unknown): string[] {
  const names = Array.isArray(raw)
    ? raw.flatMap((c) =>
        isObj(c) && typeof c.name === 'string' ? [c.name] : typeof c === 'string' ? [c] : [],
      )
    : isObj(raw)
      ? Object.values(raw).flatMap((bySource) => (isObj(bySource) ? Object.keys(bySource) : []))
      : [];
  return [...new Set(names.map((n) => CLASS_BY_EN.get(n.toLowerCase()) ?? n))];
}

/**
 * File di lookup delle classi degli incantesimi di 5etools: { fonte: { nome incantesimo: { class: … } } }.
 * I file degli incantesimi recenti non contengono più l'elenco delle classi: sta qui.
 */
export function extractSpellClassLookup(data: unknown): Map<string, string[]> | null {
  if (!isObj(data) || KEYS.some((k) => k in data)) return null;
  const out = new Map<string, string[]>();
  for (const [source, spells] of Object.entries(data)) {
    if (!isObj(spells)) continue;
    for (const [name, entry] of Object.entries(spells)) {
      if (!isObj(entry) || !('class' in entry)) continue;
      const classes = lookupClassNames(entry.class);
      if (classes.length) out.set(spellLookupKey(source, name), classes);
    }
  }
  return out.size ? out : null;
}

/** Vero se il JSON contiene almeno una sezione 5etools riconosciuta (o il lookup delle classi). */
export function isFiveEtoolsContent(data: unknown): boolean {
  return (
    (isObj(data) && KEYS.some((k) => Array.isArray(data[k]) && data[k].length > 0)) ||
    extractSpellClassLookup(data) !== null
  );
}

/**
 * Converte uno o più file 5etools. I talenti si convertono per primi, così i background
 * possono collegarsi al loro talento d'origine (anche a quelli SRD già presenti, via `knownFeats`).
 */
export function convertFiveEtoolsFiles(files: unknown[], knownFeats: FeatDef[] = []): FiveEtoolsBundle {
  const out: FiveEtoolsBundle = {
    spells: [],
    species: [],
    backgrounds: [],
    feats: [],
    items: [],
    skipped: 0,
    spellClasses: new Map(),
  };
  const take = <T>(list: unknown[], fn: (r: unknown) => T | null, into: T[]) => {
    for (const r of list) {
      const v = fn(r);
      if (v) into.push(v);
      else out.skipped++;
    }
  };
  const objs = files.filter(isObj);
  for (const f of objs) take(arr(f.feat), convertFeat, out.feats);

  const featsByEn = new Map<string, FeatDef>();
  for (const f of [...knownFeats, ...out.feats]) {
    const key = (f.nameEn ?? f.name).toLowerCase();
    if (!featsByEn.has(key) || f.origin === 'srd') featsByEn.set(key, f);
  }
  const findFeat = (n: string) => featsByEn.get(n.toLowerCase());

  for (const f of objs) {
    take(arr(f.spell), (r) => convertFiveEtoolsSpell(r), out.spells);
    take(arr(f.race), convertRace, out.species);
    take(arr(f.background), (r) => convertBackground(r, findFeat), out.backgrounds);
    take([...arr(f.item), ...arr(f.baseitem)], convertItem, out.items);
    const lookup = extractSpellClassLookup(f);
    if (lookup) for (const [k, v] of lookup) out.spellClasses.set(k, v);
  }
  for (const s of out.spells) {
    const classes = out.spellClasses.get(spellLookupKey(s.sourceBook, s.nameEn ?? s.name));
    if (classes && !s.classes.length) s.classes = classes;
  }
  return out;
}

/** Voci di libreria pronte da salvare. */
export function bundleToLibraryItems(
  b: Omit<FiveEtoolsBundle, 'spells' | 'skipped'>,
  now = Date.now(),
): LibraryItem[] {
  const base = (name: string) => ({ nameKey: normalizeKey(name), createdAt: now, updatedAt: now });
  return [
    ...b.species.map((data) => ({ ...base(data.name), id: data.id, kind: 'species' as const, data })),
    ...b.backgrounds.map((data) => ({ ...base(data.name), id: data.id, kind: 'background' as const, data })),
    ...b.feats.map((data) => ({ ...base(data.name), id: data.id, kind: 'feat' as const, data })),
    ...b.items.map((data) => ({
      ...base(data.name),
      id: stableId('item', data.name, data.sourceBook),
      kind: 'item' as const,
      data,
    })),
  ];
}
