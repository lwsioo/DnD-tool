import { DAMAGE_TYPE_LABELS } from '@/data/srd/languages';
import type { FeatureCategory } from '@/domain/character';
import type { ItemKind, WeaponData } from '@/domain/items';
import type { Recharge } from '@/domain/resources';
import { m } from '@/i18n';

export const FEATURE_CATEGORY_LABELS: Record<FeatureCategory, string> = m.terms.featureCategory;

export const ITEM_KIND_LABELS: Record<ItemKind, string> = m.terms.itemKind;

/** "Riposo Breve: 1 · Riposo Lungo: tutti". */
export function rechargeText(r: Recharge): string {
  const part = (label: string, v: Recharge['shortRest']) =>
    v === 'all' ? `${label}: ${m.terms.rechargeAll}` : v > 0 ? `${label}: ${v}` : null;
  return (
    [part(m.terms.shortRest, r.shortRest), part(m.terms.longRest, r.longRest)].filter(Boolean).join(' · ') ||
    m.terms.noRecharge
  );
}

/** "1d8 tagliente (1d10 a due mani)". */
export function damageText(w: Pick<WeaponData, 'damage' | 'versatileDice'>): string {
  const base = `${w.damage.dice} ${DAMAGE_TYPE_LABELS[w.damage.type]}`;
  return w.versatileDice ? `${base} (${m.terms.twoHanded(w.versatileDice)})` : base;
}
