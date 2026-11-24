import type { Ability, SkillKey } from '@/domain/abilities';
import type { Character, Feature, FeatureCategory } from '@/domain/character';
import {
  emptyGrants,
  type BackgroundDef,
  type FeatDef,
  type OriginGrants,
  type OriginState,
  type OriginTrait,
  type SpeciesDef,
} from '@/domain/origins';
import { itemFromSrd, emptyItem } from '@/features/inventory/srdItems';
import { WEAPONS_BY_ID } from '@/data/srd/weapons';
import { newId } from '@/lib/id';

/**
 * Applicazione di specie, background e talenti d'origine alla scheda.
 * Tutte le funzioni modificano il personaggio passato (pensate per le ricette immer)
 * e registrano in `character.origin` cosa hanno aggiunto, così da poterlo togliere
 * quando si cambia scelta senza toccare ciò che l'utente ha inserito a mano.
 */

export interface OriginLibrary {
  species: SpeciesDef[];
  backgrounds: BackgroundDef[];
  feats: FeatDef[];
}

export interface FeatChoices {
  /** Abilità scelte (Competente). */
  skills?: SkillKey[];
  /** Lista di classe (Iniziato alla Magia). */
  spellList?: string;
  /** Caratteristica da incantatore per gli incantesimi concessi. */
  spellAbility?: Ability;
}

export interface SpeciesChoices {
  optionKey?: string;
  size?: 'S' | 'M' | 'L';
  skills?: SkillKey[];
  spellAbility?: Ability;
  /** Talento d'origine aggiuntivo (Umano: Versatile). */
  featId?: string;
  feat?: FeatChoices;
}

export interface BackgroundChoices {
  /** Bonus alle caratteristiche (+2/+1 o +1/+1/+1 tra quelle del background). */
  abilityBonus: Partial<Record<Ability, number>>;
  feat?: FeatChoices;
  /** Equipaggiamento iniziale: opzione A (oggetti + monete), B (solo monete) o nessuno. */
  equipment?: 'A' | 'B' | 'none';
}

const ensureOrigin = (c: Character): OriginState =>
  (c.origin ??= { species: emptyGrants(), background: emptyGrants() });

/** Toglie dalla scheda tutto ciò che un'origine aveva aggiunto. */
export function revertGrants(c: Character, g: OriginGrants): void {
  for (const s of g.skills) {
    if (c.skills[s].prof === 1) c.skills[s].prof = 0;
  }
  if (g.tools.length) {
    const drop = new Set(g.tools);
    c.proficiencies.tools = c.proficiencies.tools.filter((t) => !drop.has(t));
  }
  for (const [a, v] of Object.entries(g.abilityBonus) as Array<[Ability, number]>) {
    c.abilities[a].bonus -= v;
  }
  if (g.featureIds.length) {
    const drop = new Set(g.featureIds);
    c.features = c.features.filter((f) => !drop.has(f.id));
  }
  if (g.spellSourceIds.length) {
    const drop = new Set(g.spellSourceIds);
    c.spellcasting.sources = c.spellcasting.sources.filter((s) => !drop.has(s.id));
    c.spellcasting.spells = c.spellcasting.spells.filter((s) => !drop.has(s.sourceId));
  }
  if (g.heroicInspiration) c.settings.heroicInspirationOnLongRest = false;
}

function grantSkills(c: Character, g: OriginGrants, skills: readonly SkillKey[]): void {
  for (const s of new Set(skills)) {
    if (c.skills[s].prof === 0) {
      c.skills[s].prof = 1;
      g.skills.push(s);
    }
  }
}

function grantTools(c: Character, g: OriginGrants, tools: readonly string[]): void {
  for (const t of tools) {
    if (!c.proficiencies.tools.includes(t)) {
      c.proficiencies.tools.push(t);
      g.tools.push(t);
    }
  }
}

function addFeature(
  c: Character,
  g: OriginGrants,
  f: Omit<Feature, 'id' | 'effects' | 'toggleable' | 'active'> & Partial<Feature>,
): Feature {
  const toggleable = f.toggleable ?? false;
  const feature: Feature = {
    effects: [],
    active: !toggleable,
    ...f,
    toggleable,
    id: newId(),
  };
  c.features.push(feature);
  g.featureIds.push(feature.id);
  return feature;
}

function traitFeature(
  c: Character,
  g: OriginGrants,
  t: OriginTrait,
  category: FeatureCategory,
  origin: string,
): void {
  addFeature(c, g, {
    category,
    name: t.name,
    origin: t.minLevel ? `${origin} · dal ${t.minLevel}° livello` : origin,
    description: t.description,
    effects: (t.effects ?? []).map((e) => ({ ...e, id: newId() })),
    uses: t.uses ? { ...t.uses, used: 0, pinned: true } : undefined,
    toggleable: t.toggleable ?? false,
  });
}

function addSpellSource(c: Character, g: OriginGrants, label: string, ability: Ability): void {
  const id = newId();
  c.spellcasting.sources.push({ id, label, ability });
  g.spellSourceIds.push(id);
}

/** Lista di incantesimi implicita nel nome con cui il background concede il talento. */
function impliedSpellList(feat: FeatDef, featName?: string): string | undefined {
  return feat.spellLists?.find((l) => featName?.includes(l));
}

/** Applica un talento (d'origine o altro), registrandone gli effetti in `g`. */
export function applyFeat(
  c: Character,
  g: OriginGrants,
  feat: FeatDef,
  choices: FeatChoices = {},
  origin = 'Talento d’origine',
): void {
  const list = choices.spellList ?? feat.spellLists?.[0];
  const name = feat.spellLists?.length && list ? `${feat.name} (${list})` : feat.name;
  addFeature(c, g, {
    category: 'feat',
    name,
    origin,
    description: feat.description,
    effects: (feat.effects ?? []).map((e) => ({ ...e, id: newId() })),
    uses: feat.uses ? { ...feat.uses, used: 0, pinned: true } : undefined,
    libraryRef: feat.id,
  });
  if (choices.skills?.length) grantSkills(c, g, choices.skills.slice(0, feat.skillChoices ?? 0));
  if (feat.spellLists?.length) addSpellSource(c, g, name, choices.spellAbility ?? 'wis');
}

/** Rimuove la specie applicata in precedenza e, se `def` è presente, applica la nuova. */
export function applySpecies(
  c: Character,
  def: SpeciesDef | null,
  choices: SpeciesChoices = {},
  lib?: Pick<OriginLibrary, 'feats'>,
): void {
  const state = ensureOrigin(c);
  revertGrants(c, state.species);
  state.species = emptyGrants();
  state.speciesId = undefined;
  state.speciesOption = undefined;
  if (!def) return;

  const g = state.species;
  const option = def.choice?.options.find((o) => o.key === choices.optionKey);
  state.speciesId = def.id;
  state.speciesOption = option?.key;

  c.identity.species = def.name;
  c.identity.size =
    choices.size && def.sizes.includes(choices.size)
      ? choices.size
      : def.sizes.includes(c.identity.size)
        ? c.identity.size
        : def.sizes[0]!;
  c.combat.speed.walk = option?.speed ?? def.speed;

  for (const t of def.traits) traitFeature(c, g, t, 'species', def.name);
  if (option) {
    for (const t of option.traits) traitFeature(c, g, t, 'species', `${def.name} · ${option.name}`);
    if (option.grantsSpells)
      addSpellSource(c, g, `${def.name} (${option.name})`, choices.spellAbility ?? 'wis');
  }

  if (def.skills?.length) grantSkills(c, g, def.skills);
  if (def.skillChoice && choices.skills?.length) {
    const allowed = def.skillChoice.from;
    const picked = choices.skills.filter((s) => !allowed || allowed.includes(s));
    grantSkills(c, g, picked.slice(0, def.skillChoice.count));
  }

  if (def.heroicInspiration && !c.settings.heroicInspirationOnLongRest) {
    c.settings.heroicInspirationOnLongRest = true;
    g.heroicInspiration = true;
  }

  if (def.originFeat && choices.featId) {
    const feat = lib?.feats.find((f) => f.id === choices.featId);
    if (feat) applyFeat(c, g, feat, choices.feat, `${def.name} · Versatile`);
  }
}

/** Rimuove il background applicato in precedenza e, se `def` è presente, applica il nuovo. */
export function applyBackground(
  c: Character,
  def: BackgroundDef | null,
  choices: BackgroundChoices = { abilityBonus: {} },
  lib?: Pick<OriginLibrary, 'feats'>,
): void {
  const state = ensureOrigin(c);
  revertGrants(c, state.background);
  state.background = emptyGrants();
  state.backgroundId = undefined;
  if (!def) return;

  const g = state.background;
  state.backgroundId = def.id;
  c.identity.background = def.name;

  for (const [a, v] of Object.entries(sanitizeBonus(def, choices.abilityBonus)) as Array<[Ability, number]>) {
    c.abilities[a].bonus += v;
    g.abilityBonus[a] = v;
  }
  grantSkills(c, g, def.skills);
  grantTools(c, g, def.tools);

  const feat = def.featId ? lib?.feats.find((f) => f.id === def.featId) : undefined;
  if (feat) {
    const featChoices = {
      ...choices.feat,
      spellList: choices.feat?.spellList ?? impliedSpellList(feat, def.featName),
    };
    applyFeat(c, g, feat, featChoices, `Background: ${def.name}`);
  } else if (def.featName || def.featId) {
    addFeature(c, g, {
      category: 'feat',
      name: def.featName ?? def.featId!,
      origin: `Background: ${def.name}`,
      description: 'Talento d’origine del background: aggiungi i dettagli dal manuale.',
    });
  }

  if (choices.equipment === 'A') addEquipment(c, def);
  if (choices.equipment === 'A' || choices.equipment === 'B') {
    c.inventory.currency.gp += choices.equipment === 'A' ? def.equipmentGoldInA : def.equipmentGold;
  }
}

/** Tiene solo bonus validi: caratteristiche del background, +2/+1 o +1/+1/+1. */
export function sanitizeBonus(
  def: Pick<BackgroundDef, 'abilities'>,
  bonus: Partial<Record<Ability, number>>,
): Partial<Record<Ability, number>> {
  const entries = (Object.entries(bonus) as Array<[Ability, number]>).filter(
    ([a, v]) => def.abilities.includes(a) && v > 0,
  );
  const values = entries.map(([, v]) => v).sort((x, y) => y - x);
  const ok =
    (values.length === 2 && values[0] === 2 && values[1] === 1) ||
    (values.length === 3 && values.every((v) => v === 1));
  return ok ? Object.fromEntries(entries) : {};
}

/** Oggetti dell'opzione A (non registrati: restano anche cambiando background). */
export function addEquipment(c: Character, def: BackgroundDef): void {
  for (const line of def.equipment) {
    if (line.weaponId && WEAPONS_BY_ID.has(line.weaponId)) {
      for (let i = 0; i < line.quantity; i++) {
        c.inventory.items.push({ ...itemFromSrd(`weapon:${line.weaponId}`), equipped: true });
      }
    } else {
      c.inventory.items.push({
        ...emptyItem(),
        name: line.name,
        quantity: line.quantity,
        weightLb: line.weightLb,
      });
    }
  }
}
