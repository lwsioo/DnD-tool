import { produce } from 'immer';
import { CLASSES_BY_KEY } from '@/data/srd/classes';
import { ABILITIES, type Ability, type SkillKey } from '@/domain/abilities';
import type { Character } from '@/domain/character';
import { createBlankCharacter } from '@/domain/factories';
import { SRD_BACKGROUNDS, SRD_FEATS, SRD_SPECIES } from '@/data/srd/origins';
import {
  applyBackground,
  applySpecies,
  type FeatChoices,
  type OriginLibrary,
  type SpeciesChoices,
} from '@/features/origins/applyOrigin';
import { bonusFromPicks } from '@/features/origins/bonus';
import { addClass } from '@/features/sheet/classActions';
import { itemFromSrd } from '@/features/inventory/srdItems';
import { itemsFromEquipmentOption } from '@/features/inventory/classEquipment';
import { CLASS_EQUIPMENT, type ClassEquipmentOption } from '@/data/srd/classEquipment';
import { rollDie } from '@/lib/dice';
import { newId } from '@/lib/id';
import { m } from '@/i18n';

const W = m.onboarding.wizard;

/** Libreria delle origini integrata (senza contenuti importati). */
export const SRD_ORIGIN_LIBRARY: OriginLibrary = {
  species: SRD_SPECIES,
  backgrounds: SRD_BACKGROUNDS,
  feats: SRD_FEATS,
};

export type AbilityMethod = 'standard' | 'pointbuy' | 'roll' | 'manual';
export type BonusMode = 'twoOne' | 'threeOnes';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

/** Classi 2024 con il privilegio Maestria nelle Armi e quante armi sbloccano al 1° livello. */
export const MASTERY_COUNT: Record<string, number> = {
  barbarian: 2,
  fighter: 3,
  paladin: 2,
  ranger: 2,
  rogue: 2,
};

export interface WizardDraft {
  name: string;
  /** Specie della libreria ('' = personalizzata, con nome in `species`). */
  speciesId: string;
  speciesChoices: SpeciesChoices;
  species: string;
  size: 'S' | 'M' | 'L';
  /** Background della libreria ('' = personalizzato, con nome in `background`). */
  backgroundId: string;
  backgroundFeat: FeatChoices;
  backgroundEquipment: 'A' | 'B' | 'none';
  background: string;
  alignment: string;
  /** classKey SRD, oppure '' per una classe personalizzata. */
  classKey: string;
  customClassName: string;
  level: number;
  subclass: string;
  method: AbilityMethod;
  /** Punteggi base prima dei bonus del background. */
  scores: Record<Ability, number>;
  /** Valori tirati (metodo 'roll'), da assegnare alle caratteristiche. */
  rolled: number[];
  bonusMode: BonusMode;
  /** twoOne: [+2, +1]; threeOnes: tre caratteristiche a +1. */
  bonusAbilities: Ability[];
  skills: SkillKey[];
  languages: string[];
  tools: string[];
  masteries: string[];
  /** Equipaggiamento iniziale della classe (opzione del manuale) o 'none' per sceglierlo a mano. */
  classEquipment: 'A' | 'B' | 'C' | 'none';
  armorId: string;
  shield: boolean;
  weaponIds: string[];
  gold: number;
  spellAbility: Ability | '';
}

const allAt = (v: number) => Object.fromEntries(ABILITIES.map((a) => [a, v])) as Record<Ability, number>;

export function initialDraft(): WizardDraft {
  return {
    name: '',
    speciesId: '',
    speciesChoices: {},
    species: '',
    size: 'M',
    backgroundId: '',
    backgroundFeat: {},
    backgroundEquipment: 'A',
    background: '',
    alignment: '',
    classKey: '',
    customClassName: '',
    level: 1,
    subclass: '',
    method: 'standard',
    scores: allAt(0),
    rolled: [],
    bonusMode: 'twoOne',
    bonusAbilities: [],
    skills: [],
    languages: [W.defaultLanguage],
    tools: [],
    masteries: [],
    classEquipment: 'none',
    armorId: '',
    shield: false,
    weaponIds: [],
    gold: 0,
    spellAbility: '',
  };
}

/** Punteggi di partenza per ciascun metodo (0 = da assegnare). */
export function scoresForMethod(method: AbilityMethod): Record<Ability, number> {
  return method === 'pointbuy' ? allAt(8) : method === 'manual' ? allAt(10) : allAt(0);
}

export function pointBuySpent(scores: Record<Ability, number>): number {
  return ABILITIES.reduce((sum, a) => sum + (POINT_BUY_COST[scores[a]] ?? Infinity), 0);
}

/** 4d6 tenendo i tre più alti, per sei volte. */
export function roll4d6DropLowest(rng: () => number = Math.random): number[] {
  return Array.from({ length: 6 }, () => {
    const dice = Array.from({ length: 4 }, () => rollDie(6, rng)).sort((a, b) => b - a);
    return dice[0]! + dice[1]! + dice[2]!;
  });
}

/** Valori ancora disponibili da assegnare (serie standard o tirati). */
export function remainingPool(pool: readonly number[], scores: Record<Ability, number>): number[] {
  const left = [...pool];
  for (const a of ABILITIES) {
    const i = left.indexOf(scores[a]);
    if (scores[a] && i >= 0) left.splice(i, 1);
  }
  return left;
}

/** Serie consigliata dal manuale per una classe SRD, come punteggi per caratteristica. */
export function recommendedArray(classKey: string): Record<Ability, number> | null {
  const cl = CLASSES_BY_KEY.get(classKey);
  if (!cl) return null;
  return Object.fromEntries(ABILITIES.map((a, i) => [a, cl.recommended[i]!])) as Record<Ability, number>;
}

/**
 * Punteggi consigliati per il metodo scelto: con serie standard, point buy (costa esattamente 27) e manuale
 * sono quelli del manuale; con i tiri 4d6 i valori tirati vengono distribuiti nello stesso ordine di importanza.
 */
export function recommendedScores(
  d: Pick<WizardDraft, 'classKey' | 'method' | 'rolled'>,
): Record<Ability, number> | null {
  const rec = recommendedArray(d.classKey);
  if (!rec) return null;
  if (d.method !== 'roll') return rec;
  if (d.rolled.length !== 6) return null;
  const rolled = [...d.rolled].sort((a, b) => b - a);
  const byImportance = [...ABILITIES].sort((a, b) => rec[b] - rec[a]);
  return Object.fromEntries(byImportance.map((a, i) => [a, rolled[i]!])) as Record<Ability, number>;
}

/** Aumenti suggeriti: tra le caratteristiche consentite, +2 alla più importante per la classe e +1 alla seconda. */
export function suggestedBonus(classKey: string, allowed: readonly Ability[] = ABILITIES): Ability[] {
  const rec = recommendedArray(classKey);
  if (!rec) return [];
  return [...allowed].sort((a, b) => rec[b] - rec[a]).slice(0, 2);
}

/** Opzione d'equipaggiamento di classe scelta, se la classe è SRD e non si sceglie a mano. */
export function classEquipmentOption(
  d: Pick<WizardDraft, 'classKey' | 'classEquipment'>,
): ClassEquipmentOption | undefined {
  if (d.classEquipment === 'none') return undefined;
  return CLASS_EQUIPMENT[d.classKey]?.find((o) => o.key === d.classEquipment);
}

/** Bonus del background per caratteristica. */
export function backgroundBonus(
  d: Pick<WizardDraft, 'bonusMode' | 'bonusAbilities'>,
): Record<Ability, number> {
  const out = allAt(0);
  if (d.bonusMode === 'twoOne') {
    const [plus2, plus1] = d.bonusAbilities;
    if (plus2) out[plus2] += 2;
    if (plus1 && plus1 !== plus2) out[plus1] += 1;
  } else {
    for (const a of new Set(d.bonusAbilities.slice(0, 3))) out[a] += 1;
  }
  return out;
}

export interface AbilityCheck {
  ok: boolean;
  message?: string;
}

/** Verifica che i punteggi base siano completi e coerenti con il metodo scelto. */
export function checkAbilities(d: WizardDraft): AbilityCheck {
  const values = ABILITIES.map((a) => d.scores[a]);
  if (d.method === 'pointbuy') {
    const spent = pointBuySpent(d.scores);
    if (!Number.isFinite(spent))
      return { ok: false, message: W.check.pointBuyRange };
    if (spent > POINT_BUY_BUDGET)
      return { ok: false, message: W.check.pointBuySpent(spent, POINT_BUY_BUDGET) };
    return { ok: true };
  }
  if (d.method === 'manual') {
    return values.every((v) => v >= 3 && v <= 18)
      ? { ok: true }
      : { ok: false, message: W.check.manualRange };
  }
  const pool = d.method === 'standard' ? STANDARD_ARRAY : d.rolled;
  if (d.method === 'roll' && pool.length !== 6) return { ok: false, message: W.check.rollFirst };
  if (values.some((v) => !v)) return { ok: false, message: W.check.assignAll };
  if (remainingPool(pool, d.scores).length !== 0)
    return { ok: false, message: W.check.useOnce };
  return { ok: true };
}

/** Costruisce il personaggio finale dalle scelte del wizard. Funzione pura (salvo gli id generati). */
export function buildCharacterFromWizard(
  d: WizardDraft,
  now = Date.now(),
  lib: OriginLibrary = SRD_ORIGIN_LIBRARY,
): Character {
  const base = createBlankCharacter(d.name.trim() || W.defaultName, now);
  const srd = d.classKey ? CLASSES_BY_KEY.get(d.classKey) : undefined;
  const speciesDef = lib.species.find((s) => s.id === d.speciesId);
  const backgroundDef = lib.backgrounds.find((b) => b.id === d.backgroundId);
  const bonus = backgroundBonus(d);

  return produce(base, (c) => {
    c.identity.species = d.species.trim();
    c.identity.size = d.size;
    c.identity.background = d.background.trim();
    c.identity.alignment = d.alignment.trim() || undefined;

    if (srd || d.customClassName.trim()) {
      const entry = addClass(c, srd ?? null);
      const cl = c.classes.find((x) => x.id === entry.id)!;
      cl.level = Math.min(20, Math.max(1, d.level));
      if (!srd) cl.name = d.customClassName.trim();
      if (d.subclass.trim()) cl.subclass = d.subclass.trim();
      // La caratteristica da incantatore scelta nel wizard sostituisce quella predefinita.
      const source = c.spellcasting.sources.find((s) => s.classEntryId === cl.id);
      if (source && d.spellAbility) source.ability = d.spellAbility;
      c.combat.hp.maxMode = 'auto';
    }
    if (!srd && d.spellAbility && !c.spellcasting.sources.length && d.customClassName.trim()) {
      c.spellcasting.sources.push({
        id: newId(),
        label: d.customClassName.trim(),
        ability: d.spellAbility,
      });
    }

    // Con un background della libreria i bonus passano da applyBackground (e restano revocabili).
    for (const a of ABILITIES) {
      c.abilities[a] = { base: d.scores[a] || 10, bonus: backgroundDef ? 0 : bonus[a] };
    }
    if (speciesDef) applySpecies(c, speciesDef, d.speciesChoices, lib);
    if (backgroundDef) {
      applyBackground(
        c,
        backgroundDef,
        {
          abilityBonus: bonusFromPicks(d.bonusMode, d.bonusAbilities),
          feat: d.backgroundFeat,
          equipment: d.backgroundEquipment,
        },
        lib,
      );
    }

    for (const s of d.skills) if (c.skills[s].prof === 0) c.skills[s] = { prof: 1 };
    c.proficiencies.languages = [...new Set(d.languages)];
    c.proficiencies.tools = [...new Set([...c.proficiencies.tools, ...d.tools])];
    c.weaponMasteries = [...new Set(d.masteries)];

    const classOption = classEquipmentOption(d);
    if (classOption) {
      c.inventory.items.push(...itemsFromEquipmentOption(classOption));
      c.inventory.currency.gp += classOption.gold;
    } else {
      // Scelta a mano: armatura, scudo e armi dalle tabelle SRD.
      if (d.armorId) c.inventory.items.push({ ...itemFromSrd(`armor:${d.armorId}`), equipped: true });
      if (d.shield) c.inventory.items.push({ ...itemFromSrd('armor:shield'), equipped: true });
      for (const w of d.weaponIds) c.inventory.items.push({ ...itemFromSrd(`weapon:${w}`), equipped: true });
    }
    c.inventory.currency.gp += Math.max(0, Math.floor(d.gold));
  });
}

/** Abilità già concesse da specie e background scelti (per non farle ricontare nel passo Competenze). */
export function originSkills(d: WizardDraft, lib: OriginLibrary = SRD_ORIGIN_LIBRARY): SkillKey[] {
  const bg = lib.backgrounds.find((b) => b.id === d.backgroundId);
  const sp = lib.species.find((s) => s.id === d.speciesId);
  const featSkills = [
    ...(d.backgroundFeat.skills ?? []),
    ...(sp?.originFeat ? (d.speciesChoices.feat?.skills ?? []) : []),
  ];
  return [
    ...new Set([
      ...(bg?.skills ?? []),
      ...(sp?.skills ?? []),
      ...(sp?.skillChoice ? (d.speciesChoices.skills ?? []) : []),
      ...featSkills,
    ]),
  ];
}

/** PF attuali = massimi, calcolati dopo la costruzione (servono i valori derivati). */
export function withFullHp(c: Character, maxHp: number): Character {
  return produce(c, (d) => {
    d.combat.hp.current = maxHp;
  });
}
