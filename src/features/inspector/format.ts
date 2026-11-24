import { DAMAGE_TYPE_LABELS } from '@/data/srd/languages';
import type { FeatureCategory } from '@/domain/character';
import type { ItemKind, WeaponData } from '@/domain/items';
import type { Recharge } from '@/domain/resources';

export const FEATURE_CATEGORY_LABELS: Record<FeatureCategory, string> = {
  class: 'Privilegio di classe',
  subclass: 'Privilegio di sottoclasse',
  species: 'Tratto della specie',
  background: 'Background',
  feat: 'Talento',
  other: 'Altro',
};

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  weapon: 'Arma',
  armor: 'Armatura',
  shield: 'Scudo',
  focus: 'Focus',
  gear: 'Equipaggiamento',
  container: 'Contenitore',
  consumable: 'Consumabile',
  tool: 'Strumento',
  treasure: 'Tesoro',
  ammunition: 'Munizioni',
};

/** "Riposo Breve: 1 · Riposo Lungo: tutti". */
export function rechargeText(r: Recharge): string {
  const part = (label: string, v: Recharge['shortRest']) =>
    v === 'all' ? `${label}: tutti` : v > 0 ? `${label}: ${v}` : null;
  return (
    [part('Riposo Breve', r.shortRest), part('Riposo Lungo', r.longRest)].filter(Boolean).join(' · ') ||
    'Nessuna ricarica'
  );
}

/** "1d8 tagliente (1d10 a due mani)". */
export function damageText(w: Pick<WeaponData, 'damage' | 'versatileDice'>): string {
  const base = `${w.damage.dice} ${DAMAGE_TYPE_LABELS[w.damage.type]}`;
  return w.versatileDice ? `${base} (${w.versatileDice} a due mani)` : base;
}
