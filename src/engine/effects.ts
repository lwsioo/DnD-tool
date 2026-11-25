import type { ArmorTraining, Character } from '@/domain/character';
import type { Effect, EffectRequirement, EffectTarget } from '@/domain/effects';
import type { InventoryItem } from '@/domain/items';
import type { ProfLevel } from '@/domain/abilities';
import { evaluateOr, type FormulaVars } from './formula';
import type { ActiveEffect, DeriveContext, Part, RollModeInfo } from './types';
import { m } from '@/i18n';

export interface EquipmentState {
  armor?: InventoryItem;
  shield?: InventoryItem;
  /** Addestramento nell'armatura indossata (true se non ne indossa). */
  armorTrained: boolean;
  shieldTrained: boolean;
}

/** Un oggetto conta se equipaggiato e, quando richiede sintonia, sintonizzato. */
export function isItemActive(item: InventoryItem): boolean {
  return item.equipped && item.attunement !== 'required';
}

export function equipmentState(c: Character): EquipmentState {
  const items = c.inventory.items.filter(isItemActive);
  const armor = items.find((i) => i.kind === 'armor' && i.armor);
  const shield = items.find((i) => i.kind === 'shield');
  const training = new Set<ArmorTraining>(c.proficiencies.armor);
  return {
    armor,
    shield,
    armorTrained: !armor?.armor || training.has(armor.armor.category),
    shieldTrained: !shield || training.has('shield'),
  };
}

function requirementsMet(requires: EffectRequirement[] | undefined, eq: EquipmentState): boolean {
  return (requires ?? []).every((r) => {
    switch (r) {
      case 'noArmor':
        return !eq.armor;
      case 'noShield':
        return !eq.shield;
      case 'armorEquipped':
        return !!eq.armor;
      case 'shieldEquipped':
        return !!eq.shield;
    }
  });
}

const implicit = (id: string, target: EffectTarget, op: Effect['op'], source: string, value?: string) =>
  ({ id: `implicit:${id}:${target}`, target, op, value, source }) satisfies ActiveEffect;

/**
 * Raccoglie tutti gli effetti attivi: privilegi (gli attivabili solo se attivi), oggetti equipaggiati,
 * condizioni, più quelli impliciti delle regole (armatura e Indebolimento).
 * Gli effetti con requisiti non soddisfatti (es. "senza armatura") vengono scartati qui.
 */
export function collectEffects(c: Character, eq: EquipmentState, ctx: DeriveContext = {}): ActiveEffect[] {
  const out: ActiveEffect[] = [];

  for (const f of c.features) {
    if (f.toggleable && !f.active) continue;
    for (const e of f.effects) out.push({ ...e, source: f.name });
  }
  for (const item of c.inventory.items) {
    if (!isItemActive(item)) continue;
    for (const e of item.effects) out.push({ ...e, source: item.name });
  }
  for (const key of c.combat.conditions) {
    const source = ctx.conditionNames?.[key] ?? key;
    for (const e of ctx.conditionEffects?.[key] ?? []) out.push({ ...e, source });
  }

  // Armatura con svantaggio a Furtività.
  if (eq.armor?.armor?.stealthDisadvantage) {
    out.push(implicit('stealth', 'skill.stealth', 'disadvantage', eq.armor.name));
  }
  // Armatura senza addestramento: svantaggio ai tiri d20 basati su FOR e DES (e niente incantesimi).
  if (eq.armor && !eq.armorTrained) {
    const source = m.engine.untrainedSource(eq.armor.name);
    for (const t of ['check.str', 'check.dex', 'save.str', 'save.dex', 'attack.all'] as const) {
      out.push(implicit('untrained', t, 'disadvantage', source));
    }
  }
  // Indebolimento (2024): −2 per livello ai tiri d20, −5 ft per livello alla velocità.
  const ex = c.combat.exhaustion;
  if (ex > 0) {
    out.push(implicit('exhaustion', 'd20.all', 'add', m.engine.exhaustion(ex), String(-2 * ex)));
    out.push(implicit('exhaustion', 'speed', 'add', m.engine.exhaustion(ex), String(-5 * ex)));
  }

  return out.filter((e) => requirementsMet(e.requires, eq));
}

export function effectsFor(effects: ActiveEffect[], targets: readonly EffectTarget[]): ActiveEffect[] {
  return effects.filter((e) => targets.includes(e.target));
}

/** Bonus numerici ('add') sui bersagli dati, come voci di scomposizione. */
export function addParts(
  effects: ActiveEffect[],
  targets: readonly EffectTarget[],
  vars: FormulaVars,
): Part[] {
  return effectsFor(effects, targets)
    .filter((e) => e.op === 'add')
    .map((e) => ({ label: e.source, value: Math.trunc(evaluateOr(e.value, vars)) }))
    .filter((p) => p.value !== 0);
}

/** Stato di vantaggio/svantaggio per un tiro che coinvolge i bersagli dati. */
export function rollModeFor(effects: ActiveEffect[], targets: readonly EffectTarget[]): RollModeInfo {
  const relevant = effectsFor(effects, targets);
  const advantage = [...new Set(relevant.filter((e) => e.op === 'advantage').map((e) => e.source))];
  const disadvantage = [...new Set(relevant.filter((e) => e.op === 'disadvantage').map((e) => e.source))];
  const mode =
    advantage.length && disadvantage.length
      ? 'cancelled'
      : advantage.length
        ? 'advantage'
        : disadvantage.length
          ? 'disadvantage'
          : 'normal';
  return { mode, advantage, disadvantage };
}

/** Livello di competenza concesso da effetti 'proficiency' / 'expertise' su un bersaglio. */
export function grantedProficiency(effects: ActiveEffect[], target: EffectTarget): ProfLevel {
  let level: ProfLevel = 0;
  for (const e of effects) {
    if (e.target !== target) continue;
    if (e.op === 'expertise') level = 2;
    else if (e.op === 'proficiency' && level < 1) level = 1;
  }
  return level;
}
