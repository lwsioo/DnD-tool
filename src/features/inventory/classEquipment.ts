import { ARMOR_BY_ID } from '@/data/srd/armor';
import type { ClassEquipmentLine, ClassEquipmentOption } from '@/data/srd/classEquipment';
import { WEAPONS_BY_ID } from '@/data/srd/weapons';
import type { InventoryItem } from '@/domain/items';
import { emptyItem, itemFromSrd } from './srdItems';
import { m } from '@/i18n';

/** Nome leggibile di una riga, con la quantità (es. "Giavellotto ×8"). */
export function equipmentLineLabel(line: ClassEquipmentLine): string {
  const [type, id = ''] = (line.srd ?? '').split(':');
  const base =
    type === 'weapon'
      ? WEAPONS_BY_ID.get(id)?.name
      : type === 'armor'
        ? ARMOR_BY_ID.get(id)?.name
        : undefined;
  const name = line.name ?? base ?? '?';
  return (line.quantity ?? 1) > 1 ? `${name} ×${line.quantity}` : name;
}

export function equipmentOptionLabel(o: ClassEquipmentOption): string {
  const items = o.items.map(equipmentLineLabel);
  return [...items, ...(o.gold ? [`${o.gold} ${m.inventory.gp}`] : [])].join(', ');
}

/**
 * Oggetti di un'opzione d'equipaggiamento: armatura, scudo e armi già equipaggiati
 * (una sola armatura), le armi multiple come un unico oggetto con quantità.
 */
export function itemsFromEquipmentOption(o: ClassEquipmentOption): InventoryItem[] {
  let armorTaken = false;
  return o.items.map((line) => {
    if (line.srd) {
      const item = itemFromSrd(line.srd);
      const isArmor = item.kind === 'armor';
      const equipped = isArmor ? !armorTaken : true;
      if (isArmor) armorTaken = true;
      return { ...item, name: line.name ?? item.name, quantity: line.quantity ?? 1, equipped };
    }
    return {
      ...emptyItem(),
      kind: line.kind ?? 'gear',
      name: line.name ?? m.inventory.itemFallback,
      quantity: line.quantity ?? 1,
      weightLb: line.weightLb,
      container: line.kind === 'container' ? { weightless: false, collapsed: false } : undefined,
    };
  });
}
