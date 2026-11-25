import type { Spell, SpellSchool } from '@/domain/spells';
import { m } from '@/i18n';
import { formatDistance, type Units } from '@/lib/units';

const G = m.grimoire;

export const SCHOOL_LABELS: Record<SpellSchool, string> = G.schools;

/** "Trucchetto di Invocazione" · "Invocazione di 3° livello". */
export function spellLevelLine(s: Pick<Spell, 'level' | 'school'>): string {
  return G.levelLine(SCHOOL_LABELS[s.school], s.level);
}

export function castingTimeText(t: Spell['castingTime']): string {
  const base = G.time[t.unit](t.amount);
  return t.condition ? `${base}, ${t.condition}` : base;
}

export function rangeText(r: Spell['range'], units: Units = 'metric'): string {
  const base =
    r.kind === 'distance' && r.distance !== undefined ? formatDistance(r.distance, units) : G.rangeKinds[r.kind];
  return r.area ? `${base} (${G.areaOf(G.areas[r.area.shape], formatDistance(r.area.size, units))})` : base;
}

export function componentsText(c: Spell['components']): string {
  const parts = [c.v && 'V', c.s && 'S', c.m && 'M'].filter(Boolean).join(', ');
  return c.m && c.material ? `${parts} (${c.material})` : parts || '—';
}

export function durationText(d: Spell['duration']): string {
  let base: string;
  if (d.kind === 'timed') {
    const unit = G.time[d.unit ?? 'minute'](d.amount ?? 1);
    base = d.concentration ? G.upTo(unit) : unit;
  } else {
    base = G.durations[d.kind];
  }
  return d.concentration ? G.concentrationPrefix(base) : base;
}
