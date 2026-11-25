import { ABILITIES, SKILLS, type Ability, type SkillKey } from '@/domain/abilities';
import type { Character } from '@/domain/character';
import type { Formula, ID } from '@/domain/primitives';
import type { Recharge } from '@/domain/resources';
import { computeAbilities, type AbilityStat } from './abilities';
import { computeArmorClass, type AcResult } from './armorClass';
import { computeAttacks, type AttackStat } from './attacks';
import { computeInitiative, computeSave, computeSkill, passiveScore } from './checks';
import { collectEffects, equipmentState } from './effects';
import { computeEncumbrance, type EncumbranceResult } from './encumbrance';
import { evaluateOr, type FormulaVars } from './formula';
import { computeMaxHp, hitDicePools, type HitDicePool } from './hp';
import { classLevels, proficiencyBonus, totalLevel } from './proficiency';
import { computeSpeed, type SpeedResult } from './speed';
import { computeSpellcasting, type SpellcastingStat } from './spellcasting';
import { computeSlots, type SlotsResult } from './spellSlots';
import type { ActiveEffect, Breakdown, DeriveContext, RollStat } from './types';
import { m } from '@/i18n';

export interface ResourceStat {
  kind: 'feature' | 'spell';
  /** id del privilegio o del CharacterSpell. */
  id: ID;
  name: string;
  max: number;
  used: number;
  recharge: Recharge;
  pinned: boolean;
  /** Formula originale, se non valutabile viene mostrata con un avviso. */
  formula: Formula;
  formulaError: boolean;
}

export interface DerivedCharacter {
  level: number;
  pb: number;
  abilities: Record<Ability, AbilityStat>;
  saves: Record<Ability, RollStat>;
  skills: Record<SkillKey, RollStat & { ability: Ability; label: string }>;
  initiative: RollStat;
  passive: { perception: Breakdown; investigation: Breakdown; insight: Breakdown };
  speed: SpeedResult;
  ac: AcResult;
  hp: { max: Breakdown; current: number; temp: number };
  hitDice: HitDicePool[];
  attacks: AttackStat[];
  spellcasting: SpellcastingStat[];
  slots: SlotsResult;
  resources: ResourceStat[];
  encumbrance: EncumbranceResult;
  effects: ActiveEffect[];
  /** Avvisi leggibili: armatura senza addestramento, Indebolimento 6, formule errate… */
  warnings: string[];
  /** Armatura senza addestramento: niente incantesimi. */
  cannotCastSpells: boolean;
  vars: FormulaVars;
}

/**
 * Calcola tutti i valori derivati della scheda. Funzione pura: stessi input → stesso output,
 * nessun accesso al DB. La UI la usa tramite useMemo (hook useDerived).
 */
export function deriveCharacter(
  c: Character,
  ctx: DeriveContext = {},
  spellNames?: Map<ID, string>,
): DerivedCharacter {
  const level = totalLevel(c);
  const pb = proficiencyBonus(level);
  const levels = classLevels(c);
  const eq = equipmentState(c);
  const effects = collectEffects(c, eq, ctx);
  const warnings: string[] = [];

  const abilities = computeAbilities(c, effects, { pb, lvl: level, classLevels: levels });
  const mods = Object.fromEntries(ABILITIES.map((a) => [a, abilities[a].mod])) as Record<Ability, number>;
  const scores = Object.fromEntries(ABILITIES.map((a) => [a, abilities[a].score])) as Record<Ability, number>;
  const vars: FormulaVars = { pb, lvl: level, classLevels: levels, mods, scores };
  const shared = { pb, effects, vars };

  const saves = Object.fromEntries(
    ABILITIES.map((a) => [a, computeSave(a, mods[a], c.saves[a], shared)]),
  ) as DerivedCharacter['saves'];
  const skills = Object.fromEntries(
    SKILLS.map((s) => [s, computeSkill(s, mods, c.skills[s].prof, c.skills[s].abilityOverride, shared)]),
  ) as DerivedCharacter['skills'];

  const maxHp = computeMaxHp(c, mods.con, effects, vars);

  const resources: ResourceStat[] = [];
  const pushResource = (
    kind: ResourceStat['kind'],
    id: ID,
    name: string,
    t: NonNullable<Character['features'][number]['uses']>,
  ) => {
    const max = Math.max(0, Math.floor(evaluateOr(t.max, vars, NaN)));
    const formulaError = Number.isNaN(max);
    if (formulaError) warnings.push(m.engine.invalidFormulaFor(name, t.max));
    resources.push({
      kind,
      id,
      name,
      max: formulaError ? 0 : max,
      used: t.used,
      recharge: t.recharge,
      pinned: t.pinned,
      formula: t.max,
      formulaError,
    });
  };
  for (const f of c.features) if (f.uses) pushResource('feature', f.id, f.name, f.uses);
  for (const s of c.spellcasting.spells) {
    if (s.freeUses) pushResource('spell', s.id, spellNames?.get(s.spellId) ?? m.engine.spell, s.freeUses);
  }

  const cannotCastSpells = !!eq.armor && !eq.armorTrained;
  if (cannotCastSpells) {
    warnings.push(
      m.engine.armorUntrained(eq.armor!.name),
    );
  }
  if (eq.shield && !eq.shieldTrained) {
    warnings.push(m.engine.shieldUntrained(eq.shield.name));
  }
  if (c.combat.exhaustion >= 6) warnings.push(m.engine.exhaustionDeath);

  const ac = computeArmorClass(c, eq, mods, effects, vars);

  return {
    level,
    pb,
    abilities,
    saves,
    skills,
    initiative: computeInitiative(mods.dex, shared),
    passive: {
      perception: passiveScore(skills.perception, effects, vars, 'perception'),
      investigation: passiveScore(skills.investigation, effects, vars, 'investigation'),
      insight: passiveScore(skills.insight, effects, vars, 'insight'),
    },
    speed: computeSpeed(c, eq, scores.str, effects, vars),
    ac,
    hp: { max: maxHp, current: c.combat.hp.current, temp: c.combat.hp.temp },
    hitDice: hitDicePools(c),
    attacks: computeAttacks(c, mods, pb, effects, vars),
    spellcasting: computeSpellcasting(c, mods, pb, effects, vars),
    slots: computeSlots(c),
    resources,
    encumbrance: computeEncumbrance(c, scores.str),
    effects,
    warnings,
    cannotCastSpells,
    vars,
  };
}
