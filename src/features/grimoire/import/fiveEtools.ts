import { CLASSES } from '@/data/srd/classes';
import { CONDITIONS, CONDITION_KEYS } from '@/data/srd/conditions';
import type { Ability } from '@/domain/abilities';
import type { DamageType, Feet } from '@/domain/primitives';
import type { Spell, SpellLevel, SpellSchool } from '@/domain/spells';
import { newId } from '@/lib/id';
import { normalizeKey } from '@/lib/normalizeKey';
import { m } from '@/i18n';

/**
 * Conversione degli incantesimi dal formato JSON di 5etools ({ "spell": [...] }) al modello di Codex.
 * Il file lo fornisce l'utente; qui si mappano struttura, tempi, gittate, durate e i tag {@...} del testo.
 * I campi sconosciuti vengono ignorati; un incantesimo non convertibile produce un avviso, non un errore.
 */

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

const SCHOOLS: Record<string, SpellSchool> = {
  A: 'abjuration',
  C: 'conjuration',
  D: 'divination',
  E: 'enchantment',
  V: 'evocation',
  I: 'illusion',
  N: 'necromancy',
  T: 'transmutation',
};

const CONDITION_BY_EN = new Map(CONDITION_KEYS.map((k) => [CONDITIONS[k].nameEn.toLowerCase(), k]));
const CLASS_BY_EN = new Map(CLASSES.map((c) => [c.nameEn.toLowerCase(), c.name]));
const ABILITY_BY_EN: Record<string, Ability> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
};
const DAMAGE_TYPES = new Set<DamageType>([
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

// ── Tag {@...} → Markdown ────────────────────────────────────────────────────────────────

/** Testo visualizzato di un tag: il terzo campo se presente ("nome|fonte|testo"), altrimenti il primo. */
const display = (parts: string[]) => (parts.length >= 3 && parts[2] ? parts[2] : (parts[0] ?? ''));

function renderTag(tag: string, body: string): string {
  const parts = body.split('|');
  switch (tag) {
    case 'b':
    case 'bold':
      return `**${parts[0]}**`;
    case 'i':
    case 'italic':
      return `*${parts[0]}*`;
    case 'condition': {
      const key = CONDITION_BY_EN.get((parts[0] ?? '').toLowerCase());
      const text = display(parts);
      return key ? `[${text}](cond:${key})` : text;
    }
    case 'scaledamage':
    case 'scaledice':
      // {@scaledamage 8d6|3-9|1d6}: il terzo campo è l'incremento per slot.
      return parts[2] ?? parts[0] ?? '';
    case 'hit':
      return `+${parts[0]}`;
    case 'dc':
      return `CD ${parts[0]}`;
    case 'chance':
      return `${parts[0]}%`;
    case 'damage':
    case 'dice':
    case 'd20':
      return parts[1] ?? parts[0] ?? '';
    default:
      return display(parts);
  }
}

/** Sostituisce i tag, partendo dai più interni (i tag possono essere annidati). */
export function convertTags(text: string): string {
  let out = text;
  const inner = /\{@(\w+)\s([^{}]*)\}/;
  for (let i = 0; i < 100 && inner.test(out); i++) {
    out = out.replace(inner, (_, tag: string, body: string) => renderTag(tag, body));
  }
  return out;
}

/** Voci di testo 5etools (stringhe, liste, tabelle, sottosezioni) → Markdown. */
export function entriesToMarkdown(entries: unknown, depth = 0): string {
  const blocks: string[] = [];
  for (const e of arr(entries)) {
    if (typeof e === 'string') {
      blocks.push(convertTags(e));
    } else if (isObj(e)) {
      const type = str(e.type);
      if (type === 'list') {
        blocks.push(
          arr(e.items)
            .map(
              (it) =>
                `- ${typeof it === 'string' ? convertTags(it) : entriesToMarkdown(isObj(it) && 'entries' in it ? [it] : [it], depth + 1).replace(/\n+/g, ' ')}`,
            )
            .join('\n'),
        );
      } else if (type === 'table') {
        const labels = arr(e.colLabels).map((l) => convertTags(String(l)));
        const rows = arr(e.rows).map((r) =>
          arr(r).map((c) =>
            convertTags(typeof c === 'string' ? c : isObj(c) ? String(c.roll ?? c.entry ?? '') : String(c)),
          ),
        );
        if (labels.length) {
          const caption = str(e.caption) ? `**${convertTags(str(e.caption)!)}**\n\n` : '';
          blocks.push(
            caption +
              [
                `| ${labels.join(' | ')} |`,
                `| ${labels.map(() => '---').join(' | ')} |`,
                ...rows.map((r) => `| ${r.join(' | ')} |`),
              ].join('\n'),
          );
        }
      } else if (type === 'quote') {
        blocks.push(
          entriesToMarkdown(e.entries, depth + 1)
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n'),
        );
      } else {
        // entries, inset, section, item…: titolo in grassetto + contenuto.
        const name = str(e.name);
        const body = entriesToMarkdown(e.entries ?? (str(e.entry) ? [e.entry] : []), depth + 1);
        blocks.push(name ? `**${convertTags(name)}${/[.:!?]$/.test(name) ? '' : '.'}** ${body}` : body);
      }
    }
  }
  return blocks.filter(Boolean).join('\n\n');
}

// ── Campi strutturati ────────────────────────────────────────────────────────────────────

function convertTime(raw: unknown): Spell['castingTime'] {
  const t = isObj(arr(raw)[0]) ? (arr(raw)[0] as Json) : {};
  const unit = str(t.unit);
  const map: Record<string, Spell['castingTime']['unit']> = {
    action: 'action',
    bonus: 'bonus',
    reaction: 'reaction',
    minute: 'minute',
    hour: 'hour',
  };
  return {
    amount: num(t.number) ?? 1,
    unit: (unit && map[unit]) || 'action',
    condition: str(t.condition) ? convertTags(str(t.condition)!) : undefined,
  };
}

function convertRange(raw: unknown): Spell['range'] {
  if (!isObj(raw)) return { kind: 'special' };
  const type = str(raw.type);
  const d = isObj(raw.distance) ? raw.distance : {};
  const dType = str(d.type);
  const amount = num(d.amount);
  const feet = (): Feet | undefined =>
    amount === undefined ? undefined : dType === 'miles' ? amount * 5280 : amount;

  if (type === 'point') {
    switch (dType) {
      case 'self':
        return { kind: 'self' };
      case 'touch':
        return { kind: 'touch' };
      case 'sight':
        return { kind: 'sight' };
      case 'unlimited':
        return { kind: 'unlimited' };
      default:
        return feet() !== undefined ? { kind: 'distance', distance: feet() } : { kind: 'special' };
    }
  }
  const shapes: Record<string, NonNullable<Spell['range']['area']>['shape']> = {
    radius: 'sphere',
    sphere: 'sphere',
    hemisphere: 'sphere',
    cone: 'cone',
    line: 'line',
    cube: 'cube',
    cylinder: 'cylinder',
    emanation: 'emanation',
  };
  const shape = type ? shapes[type] : undefined;
  if (shape && feet() !== undefined) return { kind: 'self', area: { shape, size: feet()! } };
  return { kind: 'special' };
}

function convertComponents(raw: unknown): Spell['components'] {
  const c = isObj(raw) ? raw : {};
  const m = c.m;
  const material = typeof m === 'string' ? m : isObj(m) ? str(m.text) : undefined;
  const costCp = isObj(m) ? num(m.cost) : undefined;
  return {
    v: !!c.v,
    s: !!c.s,
    m: !!m,
    material: material ? convertTags(material) : undefined,
    costGp: costCp !== undefined ? costCp / 100 : undefined,
    consumed: isObj(m) && m.consume ? true : undefined,
  };
}

function convertDuration(raw: unknown): Spell['duration'] {
  const d = isObj(arr(raw)[0]) ? (arr(raw)[0] as Json) : {};
  const concentration = !!d.concentration;
  switch (str(d.type)) {
    case 'instant':
      return { kind: 'instant', concentration: false };
    case 'permanent':
      return { kind: 'untilDispelled', concentration };
    case 'timed': {
      const inner = isObj(d.duration) ? d.duration : {};
      const units: Record<string, 'round' | 'minute' | 'hour' | 'day'> = {
        round: 'round',
        turn: 'round',
        minute: 'minute',
        hour: 'hour',
        day: 'day',
      };
      const unit = str(inner.type);
      return {
        kind: 'timed',
        amount: num(inner.amount) ?? 1,
        unit: (unit && units[unit]) || 'minute',
        concentration,
      };
    }
    default:
      return { kind: 'special', concentration };
  }
}

/** Scaling dei trucchetti (scalingLevelDice) e incremento per slot ({@scaledamage …|…|1d6}). */
function convertScaling(raw: Json): Spell['scaling'] {
  const out: NonNullable<Spell['scaling']> = {};
  const sld = Array.isArray(raw.scalingLevelDice) ? raw.scalingLevelDice[0] : raw.scalingLevelDice;
  if (isObj(sld) && isObj(sld.scaling)) {
    const s = sld.scaling as Record<string, unknown>;
    const at = (lvl: number) => str(s[String(lvl)]);
    if (at(1) && at(5) && at(11) && at(17)) out.cantrip = [at(1)!, at(5)!, at(11)!, at(17)!];
  }
  const higher = JSON.stringify(raw.entriesHigherLevel ?? '');
  const m = /\{@scale(?:damage|dice) [^|}]+\|[^|}]+\|([^|}]+)\}/.exec(higher);
  if (m?.[1]) out.perSlot = m[1].trim();
  return out.cantrip || out.perSlot ? out : undefined;
}

function convertClasses(raw: Json): string[] {
  const classes = isObj(raw.classes) ? raw.classes : {};
  const names = arr(classes.fromClassList)
    .map((c) => (isObj(c) ? str(c.name) : undefined))
    .filter((n): n is string => !!n)
    .map((n) => CLASS_BY_EN.get(n.toLowerCase()) ?? n);
  return [...new Set(names)];
}

export interface ConversionResult {
  spells: Spell[];
  warnings: string[];
}

/** Converte un singolo incantesimo 5etools; null se mancano nome o livello. */
export function convertFiveEtoolsSpell(raw: unknown, now = Date.now()): Spell | null {
  if (!isObj(raw)) return null;
  const name = str(raw.name);
  const level = num(raw.level);
  if (!name || level === undefined || level < 0 || level > 9) return null;
  const meta = isObj(raw.meta) ? raw.meta : {};
  const saves = arr(raw.savingThrow)
    .map((s) => ABILITY_BY_EN[String(s).toLowerCase()])
    .filter(Boolean);
  const attacks = arr(raw.spellAttack).map(String);
  const damageTypes = arr(raw.damageInflict)
    .map(String)
    .filter((d): d is DamageType => DAMAGE_TYPES.has(d as DamageType));
  const higher = entriesToMarkdown(
    arr(raw.entriesHigherLevel).flatMap((e) => (isObj(e) ? arr(e.entries) : [e])),
  );

  return {
    id: newId(),
    origin: 'import',
    sourceBook: str(raw.source),
    name,
    nameKey: normalizeKey(name),
    nameEn: name,
    level: level as SpellLevel,
    school: SCHOOLS[str(raw.school) ?? ''] ?? 'evocation',
    castingTime: convertTime(raw.time),
    ritual: !!meta.ritual,
    range: convertRange(raw.range),
    components: convertComponents(raw.components),
    duration: convertDuration(raw.duration),
    description: entriesToMarkdown(raw.entries),
    higherLevels: higher || undefined,
    scaling: convertScaling(raw),
    classes: convertClasses(raw),
    tags: [],
    save: saves[0],
    attack: attacks.includes('M') ? 'melee' : attacks.includes('R') ? 'ranged' : undefined,
    damageTypes: damageTypes.length ? damageTypes : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** Riconosce `{ "spell": [...] }` (5etools) o un array di incantesimi 5etools. */
export function isFiveEtoolsFile(data: unknown): boolean {
  const list = isObj(data) ? data.spell : data;
  return (
    Array.isArray(list) &&
    list.some((s) => isObj(s) && typeof s.name === 'string' && 'level' in s && 'school' in s)
  );
}

export function convertFiveEtoolsFile(data: unknown): ConversionResult {
  const list = arr(isObj(data) ? data.spell : data);
  const spells: Spell[] = [];
  const warnings: string[] = [];
  list.forEach((raw, i) => {
    const spell = convertFiveEtoolsSpell(raw);
    if (spell) spells.push(spell);
    else warnings.push(m.grimoire.skippedEntry(i + 1));
  });
  return { spells, warnings };
}
