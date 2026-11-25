import type { Feet } from '@/domain/primitives';
import { LANG_TAG, pick } from '@/i18n/locale';

export type Units = 'metric' | 'imperial';

const num = new Intl.NumberFormat(LANG_TAG, { maximumFractionDigits: 2 });
/** Sigle delle monete: mo/ma/mr in italiano, gp/sp/cp in inglese. */
const COIN = pick({ gp: 'mo', sp: 'ma', cp: 'mr' }, { gp: 'gp', sp: 'sp', cp: 'cp' });

/** Distanza: in metri secondo la convenzione dei manuali italiani (5 ft = 1,5 m). */
export function formatDistance(feet: Feet, units: Units = 'metric'): string {
  return units === 'metric' ? `${num.format((feet / 5) * 1.5)} m` : `${num.format(feet)} ft`;
}

/** Coppia di gittate: "6/18 m". */
export function formatRange(normal: Feet, long: Feet, units: Units = 'metric'): string {
  if (units === 'metric') return `${num.format((normal / 5) * 1.5)}/${num.format((long / 5) * 1.5)} m`;
  return `${num.format(normal)}/${num.format(long)} ft`;
}

/** Peso: 1 lb = 0,5 kg, come nei manuali italiani. */
export function formatWeight(lb: number, units: Units = 'metric'): string {
  if (lb === 0) return '—';
  return units === 'metric' ? `${num.format(lb / 2)} kg` : `${num.format(lb)} lb`;
}

/** Costo in monete: usa il taglio più grande che divide esattamente (15 mo, 5 ma, 5 mr). */
export function formatCost(cp: number): string {
  if (cp === 0) return '—';
  if (cp % 100 === 0) return `${num.format(cp / 100)} ${COIN.gp}`;
  if (cp % 10 === 0) return `${num.format(cp / 10)} ${COIN.sp}`;
  return `${num.format(cp)} ${COIN.cp}`;
}

/** Sigla della moneta d'oro nella lingua attiva ("mo" / "gp"). */
export const GP = COIN.gp;
