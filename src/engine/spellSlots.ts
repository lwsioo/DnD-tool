import { FULL_CASTER_SLOTS, PACT_MAGIC } from '@/data/srd/slotTables';
import type { Character, ClassEntry } from '@/domain/character';

export interface SlotLevelState {
  /** Livello dell'incantesimo, 1..9. */
  level: number;
  max: number;
  used: number;
}

export interface SlotsResult {
  /** Sempre 9 voci (livelli 1..9), anche con max 0. */
  standard: SlotLevelState[];
  /** 'single' = tabella della propria classe; 'multiclass' = tabella per livello da incantatore. */
  mode: 'none' | 'single' | 'multiclass';
  casterLevel: number;
  pact: { max: number; used: number; slotLevel: number } | null;
}

const clampLevel = (l: number) => Math.min(20, Math.max(0, Math.floor(l)));

function fullRow(level: number): number[] {
  const row = level > 0 ? (FULL_CASTER_SLOTS[clampLevel(level) - 1] ?? []) : [];
  return Array.from({ length: 9 }, (_, i) => row[i] ?? 0);
}

/** Tabella della classe singola per progressione (2024: i semi-incantatori hanno slot dal 1° livello). */
function singleClassRow(cl: Pick<ClassEntry, 'caster' | 'level'>): number[] {
  switch (cl.caster) {
    case 'full':
      return fullRow(cl.level);
    case 'half':
      return fullRow(Math.ceil(cl.level / 2));
    case 'third':
      return cl.level < 3 ? fullRow(0) : fullRow(Math.ceil(cl.level / 3));
    default:
      return fullRow(0);
  }
}

/**
 * Livello da incantatore multiclasse (PHB 2024): tutti i livelli degli incantatori completi,
 * metà (per eccesso) di quelli dei semi-incantatori, un terzo (per difetto) di quelli a un terzo.
 */
export function multiclassCasterLevel(classes: Pick<ClassEntry, 'caster' | 'level'>[]): number {
  const sum = (kind: ClassEntry['caster']) =>
    classes.filter((c) => c.caster === kind).reduce((a, c) => a + c.level, 0);
  return sum('full') + Math.ceil(sum('half') / 2) + Math.floor(sum('third') / 3);
}

export function standardSlotMaxima(classes: Pick<ClassEntry, 'caster' | 'level'>[]): {
  max: number[];
  mode: SlotsResult['mode'];
  casterLevel: number;
} {
  const casters = classes.filter((c) => c.caster === 'full' || c.caster === 'half' || c.caster === 'third');
  if (casters.length === 0) return { max: fullRow(0), mode: 'none', casterLevel: 0 };
  if (casters.length === 1) {
    const only = casters[0]!;
    return { max: singleClassRow(only), mode: 'single', casterLevel: multiclassCasterLevel(casters) };
  }
  const casterLevel = multiclassCasterLevel(casters);
  return { max: fullRow(casterLevel), mode: 'multiclass', casterLevel };
}

export function pactMagic(classes: Pick<ClassEntry, 'caster' | 'level'>[]) {
  const level = classes.filter((c) => c.caster === 'pact').reduce((a, c) => a + c.level, 0);
  if (level <= 0) return null;
  return PACT_MAGIC[clampLevel(level) - 1]!;
}

export function computeSlots(c: Character): SlotsResult {
  const { max, mode, casterLevel } = standardSlotMaxima(c.classes);
  const { used, maxOverride } = c.spellcasting.slots;
  const standard = max.map((m, i) => {
    const override = maxOverride?.[i];
    const effectiveMax = override ?? m;
    return { level: i + 1, max: effectiveMax, used: Math.min(used[i] ?? 0, effectiveMax) };
  });
  const pm = pactMagic(c.classes);
  const pact = pm
    ? { max: pm.slots, slotLevel: pm.slotLevel, used: Math.min(c.spellcasting.pact?.used ?? 0, pm.slots) }
    : null;
  return { standard, mode, casterLevel, pact };
}
