import type { Feet } from '@/domain/primitives';

export type Units = 'metric' | 'imperial';

const it = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

/** Distanza: in metri secondo la convenzione dei manuali italiani (5 ft = 1,5 m). */
export function formatDistance(feet: Feet, units: Units = 'metric'): string {
  return units === 'metric' ? `${it.format((feet / 5) * 1.5)} m` : `${it.format(feet)} ft`;
}

/** Coppia di gittate: "6/18 m". */
export function formatRange(normal: Feet, long: Feet, units: Units = 'metric'): string {
  if (units === 'metric') return `${it.format((normal / 5) * 1.5)}/${it.format((long / 5) * 1.5)} m`;
  return `${it.format(normal)}/${it.format(long)} ft`;
}

/** Peso: 1 lb = 0,5 kg, come nei manuali italiani. */
export function formatWeight(lb: number, units: Units = 'metric'): string {
  if (lb === 0) return '—';
  return units === 'metric' ? `${it.format(lb / 2)} kg` : `${it.format(lb)} lb`;
}

/** Costo in monete: usa il taglio più grande che divide esattamente (15 mo, 5 ma, 5 mr). */
export function formatCost(cp: number): string {
  if (cp === 0) return '—';
  if (cp % 100 === 0) return `${it.format(cp / 100)} mo`;
  if (cp % 10 === 0) return `${it.format(cp / 10)} ma`;
  return `${it.format(cp)} mr`;
}
