import { produce, type Draft } from 'immer';
import type { Character, ClassEntry, Feature } from '@/domain/character';
import type { Effect } from '@/domain/effects';
import { createBlankCharacter } from '@/domain/factories';
import type { ArmorData, InventoryItem, WeaponData } from '@/domain/items';
import type { Die } from '@/domain/primitives';

let seq = 0;
const id = (prefix: string) => `${prefix}-${++seq}`;

export function makeCharacter(recipe?: (d: Draft<Character>) => void): Character {
  const base = createBlankCharacter('Test', 0);
  return recipe ? produce(base, recipe) : base;
}

export function cls(
  classKey: string,
  level: number,
  hitDie: Die,
  caster: ClassEntry['caster'] = 'none',
): ClassEntry {
  return { id: id('class'), classKey, name: classKey, level, hitDie, caster };
}

export function armorItem(
  name: string,
  data: Partial<ArmorData> & Pick<ArmorData, 'category' | 'baseAc'>,
  equipped = true,
): InventoryItem {
  return {
    id: id('armor'),
    parentId: null,
    kind: 'armor',
    name,
    quantity: 1,
    equipped,
    effects: [],
    armor: {
      dexCap: data.category === 'light' ? null : data.category === 'medium' ? 2 : 0,
      stealthDisadvantage: false,
      magicBonus: 0,
      ...data,
    },
  };
}

export function shieldItem(name = 'Scudo', acBonus = 2, equipped = true): InventoryItem {
  return {
    id: id('shield'),
    parentId: null,
    kind: 'shield',
    name,
    quantity: 1,
    equipped,
    effects: [],
    shield: { acBonus },
  };
}

export function weaponItem(name: string, weapon: Partial<WeaponData> = {}, equipped = true): InventoryItem {
  return {
    id: id('weapon'),
    parentId: null,
    kind: 'weapon',
    name,
    quantity: 1,
    equipped,
    effects: [],
    weapon: {
      category: 'simple',
      type: 'melee',
      damage: { dice: '1d6', type: 'slashing' },
      properties: [],
      magicBonus: 0,
      hand: 'main',
      ...weapon,
    },
  };
}

export function feature(
  name: string,
  effects: Omit<Effect, 'id'>[] = [],
  extra: Partial<Feature> = {},
): Feature {
  return {
    id: id('feature'),
    category: 'class',
    name,
    description: '',
    effects: effects.map((e) => ({ ...e, id: id('effect') })),
    toggleable: false,
    active: true,
    ...extra,
  };
}
