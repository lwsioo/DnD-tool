import type { Spell, SpellSchool } from '@/domain/spells';
import { formatDistance, type Units } from '@/lib/units';

export const SCHOOL_LABELS: Record<SpellSchool, string> = {
  abjuration: 'Abiurazione',
  conjuration: 'Evocazione',
  divination: 'Divinazione',
  enchantment: 'Ammaliamento',
  evocation: 'Invocazione',
  illusion: 'Illusione',
  necromancy: 'Necromanzia',
  transmutation: 'Trasmutazione',
};

/** "Trucchetto di Invocazione" · "Invocazione di 3° livello". */
export function spellLevelLine(s: Pick<Spell, 'level' | 'school'>): string {
  const school = SCHOOL_LABELS[s.school];
  return s.level === 0 ? `Trucchetto di ${school}` : `${school} di ${s.level}° livello`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function castingTimeText(t: Spell['castingTime']): string {
  const base = {
    action: plural(t.amount, 'azione', 'azioni'),
    bonus: t.amount === 1 ? '1 azione bonus' : `${t.amount} azioni bonus`,
    reaction: plural(t.amount, 'reazione', 'reazioni'),
    minute: plural(t.amount, 'minuto', 'minuti'),
    hour: plural(t.amount, 'ora', 'ore'),
  }[t.unit];
  return t.condition ? `${base}, ${t.condition}` : base;
}

const AREA_LABELS = {
  cone: 'cono',
  cube: 'cubo',
  cylinder: 'cilindro',
  line: 'linea',
  sphere: 'sfera',
  emanation: 'emanazione',
} as const;

export function rangeText(r: Spell['range'], units: Units = 'metric'): string {
  const base = {
    self: 'Incantatore',
    touch: 'Contatto',
    distance: r.distance !== undefined ? formatDistance(r.distance, units) : 'Distanza',
    sight: 'Vista',
    unlimited: 'Illimitata',
    special: 'Speciale',
  }[r.kind];
  return r.area ? `${base} (${AREA_LABELS[r.area.shape]} di ${formatDistance(r.area.size, units)})` : base;
}

export function componentsText(c: Spell['components']): string {
  const parts = [c.v && 'V', c.s && 'S', c.m && 'M'].filter(Boolean).join(', ');
  return c.m && c.material ? `${parts} (${c.material})` : parts || '—';
}

export function durationText(d: Spell['duration']): string {
  let base: string;
  switch (d.kind) {
    case 'instant':
      base = 'Istantanea';
      break;
    case 'untilDispelled':
      base = 'Finché non viene dissolto';
      break;
    case 'special':
      base = 'Speciale';
      break;
    case 'timed': {
      const n = d.amount ?? 1;
      const unit = {
        round: plural(n, 'round', 'round'),
        minute: plural(n, 'minuto', 'minuti'),
        hour: plural(n, 'ora', 'ore'),
        day: plural(n, 'giorno', 'giorni'),
      }[d.unit ?? 'minute'];
      base = d.concentration ? `fino a ${unit}` : unit;
    }
  }
  return d.concentration ? `Concentrazione, ${base}` : base;
}
