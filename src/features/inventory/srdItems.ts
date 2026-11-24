import { ARMOR_BY_ID } from '@/data/srd/armor';
import { WEAPONS_BY_ID, weaponDataFromBase } from '@/data/srd/weapons';
import type { InventoryItem } from '@/domain/items';
import { newId } from '@/lib/id';

/** Oggetto vuoto. */
export const emptyItem = (): InventoryItem => ({
  id: newId(),
  parentId: null,
  kind: 'gear',
  name: '',
  quantity: 1,
  equipped: false,
  effects: [],
});

/** Nuovo oggetto da una voce SRD (arma, armatura o scudo). */
export function itemFromSrd(ref: string): InventoryItem {
  const [type, id = ''] = ref.split(':');
  if (type === 'weapon') {
    const w = WEAPONS_BY_ID.get(id)!;
    return {
      ...emptyItem(),
      kind: 'weapon',
      name: w.name,
      weightLb: w.weightLb,
      valueCp: w.costCp,
      weapon: weaponDataFromBase(w),
    };
  }
  const a = ARMOR_BY_ID.get(id)!;
  if (a.category === 'shield') {
    return {
      ...emptyItem(),
      kind: 'shield',
      name: a.name,
      weightLb: a.weightLb,
      valueCp: a.costCp,
      shield: { acBonus: a.baseAc },
    };
  }
  return {
    ...emptyItem(),
    kind: 'armor',
    name: a.name,
    weightLb: a.weightLb,
    valueCp: a.costCp,
    armor: {
      category: a.category,
      baseAc: a.baseAc,
      dexCap: a.dexCap,
      strRequirement: a.strRequirement,
      stealthDisadvantage: a.stealthDisadvantage,
      magicBonus: 0,
    },
  };
}
