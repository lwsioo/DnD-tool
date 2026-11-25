import type { DamageType } from '@/domain/primitives';
import type { MasteryKey, WeaponData, WeaponPropertyRef } from '@/domain/items';
import { LOCALE } from '@/i18n/locale';

/** Arma base della tabella SRD 5.2: precompila WeaponData quando si aggiunge un'arma all'inventario. */
export interface WeaponBase {
  id: string;
  name: string;
  nameEn: string;
  category: 'simple' | 'martial';
  type: 'melee' | 'ranged';
  damage: { dice: string; type: DamageType };
  versatileDice?: string;
  properties: WeaponPropertyRef[];
  mastery: MasteryKey;
  /** Munizione usata, per le armi con Munizioni. */
  ammunition?: string;
  weightLb: number;
  costCp: number;
}

const gp = (n: number) => n * 100;
const sp = (n: number) => n * 10;
const P = {
  finesse: { key: 'finesse' },
  heavy: { key: 'heavy' },
  light: { key: 'light' },
  loading: { key: 'loading' },
  reach: { key: 'reach' },
  twoHanded: { key: 'twoHanded' },
  versatile: { key: 'versatile' },
  ammunition: { key: 'ammunition' },
  thrown: (normal: number, long: number) => ({ key: 'thrown', normal, long }) as const,
  range: (normal: number, long: number) => ({ key: 'range', normal, long }) as const,
} as const satisfies Record<string, WeaponPropertyRef | ((a: number, b: number) => WeaponPropertyRef)>;

type Row = Omit<WeaponBase, 'category' | 'type'>;
const group = (category: WeaponBase['category'], type: WeaponBase['type'], rows: Row[]): WeaponBase[] =>
  rows.map((r) => ({ ...r, category, type }));

// prettier-ignore
const WEAPONS_IT: WeaponBase[] = [
  ...group('simple', 'melee', [
    { id: 'club', name: 'Randello', nameEn: 'Club', damage: { dice: '1d4', type: 'bludgeoning' }, properties: [P.light], mastery: 'slow', weightLb: 2, costCp: sp(1) },
    { id: 'dagger', name: 'Pugnale', nameEn: 'Dagger', damage: { dice: '1d4', type: 'piercing' }, properties: [P.finesse, P.light, P.thrown(20, 60)], mastery: 'nick', weightLb: 1, costCp: gp(2) },
    { id: 'greatclub', name: 'Randello Pesante', nameEn: 'Greatclub', damage: { dice: '1d8', type: 'bludgeoning' }, properties: [P.twoHanded], mastery: 'push', weightLb: 10, costCp: sp(2) },
    { id: 'handaxe', name: 'Ascia', nameEn: 'Handaxe', damage: { dice: '1d6', type: 'slashing' }, properties: [P.light, P.thrown(20, 60)], mastery: 'vex', weightLb: 2, costCp: gp(5) },
    { id: 'javelin', name: 'Giavellotto', nameEn: 'Javelin', damage: { dice: '1d6', type: 'piercing' }, properties: [P.thrown(30, 120)], mastery: 'slow', weightLb: 2, costCp: sp(5) },
    { id: 'light-hammer', name: 'Martello Leggero', nameEn: 'Light Hammer', damage: { dice: '1d4', type: 'bludgeoning' }, properties: [P.light, P.thrown(20, 60)], mastery: 'nick', weightLb: 2, costCp: gp(2) },
    { id: 'mace', name: 'Mazza', nameEn: 'Mace', damage: { dice: '1d6', type: 'bludgeoning' }, properties: [], mastery: 'sap', weightLb: 4, costCp: gp(5) },
    { id: 'quarterstaff', name: 'Bastone Ferrato', nameEn: 'Quarterstaff', damage: { dice: '1d6', type: 'bludgeoning' }, versatileDice: '1d8', properties: [P.versatile], mastery: 'topple', weightLb: 4, costCp: sp(2) },
    { id: 'sickle', name: 'Falcetto', nameEn: 'Sickle', damage: { dice: '1d4', type: 'slashing' }, properties: [P.light], mastery: 'nick', weightLb: 2, costCp: gp(1) },
    { id: 'spear', name: 'Lancia', nameEn: 'Spear', damage: { dice: '1d6', type: 'piercing' }, versatileDice: '1d8', properties: [P.thrown(20, 60), P.versatile], mastery: 'sap', weightLb: 3, costCp: gp(1) },
  ]),
  ...group('simple', 'ranged', [
    { id: 'dart', name: 'Dardo', nameEn: 'Dart', damage: { dice: '1d4', type: 'piercing' }, properties: [P.finesse, P.thrown(20, 60)], mastery: 'vex', weightLb: 0.25, costCp: 5 },
    { id: 'light-crossbow', name: 'Balestra Leggera', nameEn: 'Light Crossbow', damage: { dice: '1d8', type: 'piercing' }, properties: [P.ammunition, P.range(80, 320), P.loading, P.twoHanded], mastery: 'slow', ammunition: 'Quadrello', weightLb: 5, costCp: gp(25) },
    { id: 'shortbow', name: 'Arco Corto', nameEn: 'Shortbow', damage: { dice: '1d6', type: 'piercing' }, properties: [P.ammunition, P.range(80, 320), P.twoHanded], mastery: 'vex', ammunition: 'Freccia', weightLb: 2, costCp: gp(25) },
    { id: 'sling', name: 'Fionda', nameEn: 'Sling', damage: { dice: '1d4', type: 'bludgeoning' }, properties: [P.ammunition, P.range(30, 120)], mastery: 'slow', ammunition: 'Proiettile da fionda', weightLb: 0, costCp: sp(1) },
  ]),
  ...group('martial', 'melee', [
    { id: 'battleaxe', name: 'Ascia da Battaglia', nameEn: 'Battleaxe', damage: { dice: '1d8', type: 'slashing' }, versatileDice: '1d10', properties: [P.versatile], mastery: 'topple', weightLb: 4, costCp: gp(10) },
    { id: 'flail', name: 'Mazzafrusto', nameEn: 'Flail', damage: { dice: '1d8', type: 'bludgeoning' }, properties: [], mastery: 'sap', weightLb: 2, costCp: gp(10) },
    { id: 'glaive', name: 'Falcione', nameEn: 'Glaive', damage: { dice: '1d10', type: 'slashing' }, properties: [P.heavy, P.reach, P.twoHanded], mastery: 'graze', weightLb: 6, costCp: gp(20) },
    { id: 'greataxe', name: 'Ascia Bipenne', nameEn: 'Greataxe', damage: { dice: '1d12', type: 'slashing' }, properties: [P.heavy, P.twoHanded], mastery: 'cleave', weightLb: 7, costCp: gp(30) },
    { id: 'greatsword', name: 'Spadone', nameEn: 'Greatsword', damage: { dice: '2d6', type: 'slashing' }, properties: [P.heavy, P.twoHanded], mastery: 'graze', weightLb: 6, costCp: gp(50) },
    { id: 'halberd', name: 'Alabarda', nameEn: 'Halberd', damage: { dice: '1d10', type: 'slashing' }, properties: [P.heavy, P.reach, P.twoHanded], mastery: 'cleave', weightLb: 6, costCp: gp(20) },
    { id: 'lance', name: 'Lancia da Cavaliere', nameEn: 'Lance', damage: { dice: '1d10', type: 'piercing' }, properties: [P.heavy, P.reach, P.twoHanded], mastery: 'topple', weightLb: 6, costCp: gp(10) },
    { id: 'longsword', name: 'Spada Lunga', nameEn: 'Longsword', damage: { dice: '1d8', type: 'slashing' }, versatileDice: '1d10', properties: [P.versatile], mastery: 'sap', weightLb: 3, costCp: gp(15) },
    { id: 'maul', name: 'Maglio', nameEn: 'Maul', damage: { dice: '2d6', type: 'bludgeoning' }, properties: [P.heavy, P.twoHanded], mastery: 'topple', weightLb: 10, costCp: gp(10) },
    { id: 'morningstar', name: 'Morning Star', nameEn: 'Morningstar', damage: { dice: '1d8', type: 'piercing' }, properties: [], mastery: 'sap', weightLb: 4, costCp: gp(15) },
    { id: 'pike', name: 'Picca', nameEn: 'Pike', damage: { dice: '1d10', type: 'piercing' }, properties: [P.heavy, P.reach, P.twoHanded], mastery: 'push', weightLb: 18, costCp: gp(5) },
    { id: 'rapier', name: 'Stocco', nameEn: 'Rapier', damage: { dice: '1d8', type: 'piercing' }, properties: [P.finesse], mastery: 'vex', weightLb: 2, costCp: gp(25) },
    { id: 'scimitar', name: 'Scimitarra', nameEn: 'Scimitar', damage: { dice: '1d6', type: 'slashing' }, properties: [P.finesse, P.light], mastery: 'nick', weightLb: 3, costCp: gp(25) },
    { id: 'shortsword', name: 'Spada Corta', nameEn: 'Shortsword', damage: { dice: '1d6', type: 'piercing' }, properties: [P.finesse, P.light], mastery: 'vex', weightLb: 2, costCp: gp(10) },
    { id: 'trident', name: 'Tridente', nameEn: 'Trident', damage: { dice: '1d8', type: 'piercing' }, versatileDice: '1d10', properties: [P.thrown(20, 60), P.versatile], mastery: 'topple', weightLb: 4, costCp: gp(5) },
    { id: 'warhammer', name: 'Martello da Guerra', nameEn: 'Warhammer', damage: { dice: '1d8', type: 'bludgeoning' }, versatileDice: '1d10', properties: [P.versatile], mastery: 'push', weightLb: 5, costCp: gp(15) },
    { id: 'war-pick', name: 'Piccone da Guerra', nameEn: 'War Pick', damage: { dice: '1d8', type: 'piercing' }, versatileDice: '1d10', properties: [P.versatile], mastery: 'sap', weightLb: 2, costCp: gp(5) },
    { id: 'whip', name: 'Frusta', nameEn: 'Whip', damage: { dice: '1d4', type: 'slashing' }, properties: [P.finesse, P.reach], mastery: 'slow', weightLb: 3, costCp: gp(2) },
  ]),
  ...group('martial', 'ranged', [
    { id: 'blowgun', name: 'Cerbottana', nameEn: 'Blowgun', damage: { dice: '1', type: 'piercing' }, properties: [P.ammunition, P.range(25, 100), P.loading], mastery: 'vex', ammunition: 'Ago', weightLb: 1, costCp: gp(10) },
    { id: 'hand-crossbow', name: 'Balestra a Mano', nameEn: 'Hand Crossbow', damage: { dice: '1d6', type: 'piercing' }, properties: [P.ammunition, P.range(30, 120), P.light, P.loading], mastery: 'vex', ammunition: 'Quadrello', weightLb: 3, costCp: gp(75) },
    { id: 'heavy-crossbow', name: 'Balestra Pesante', nameEn: 'Heavy Crossbow', damage: { dice: '1d10', type: 'piercing' }, properties: [P.ammunition, P.range(100, 400), P.heavy, P.loading, P.twoHanded], mastery: 'push', ammunition: 'Quadrello', weightLb: 18, costCp: gp(50) },
    { id: 'longbow', name: 'Arco Lungo', nameEn: 'Longbow', damage: { dice: '1d8', type: 'piercing' }, properties: [P.ammunition, P.range(150, 600), P.heavy, P.twoHanded], mastery: 'slow', ammunition: 'Freccia', weightLb: 2, costCp: gp(50) },
    { id: 'musket', name: 'Moschetto', nameEn: 'Musket', damage: { dice: '1d12', type: 'piercing' }, properties: [P.ammunition, P.range(40, 120), P.loading, P.twoHanded], mastery: 'slow', ammunition: 'Pallottola', weightLb: 10, costCp: gp(500) },
    { id: 'pistol', name: 'Pistola', nameEn: 'Pistol', damage: { dice: '1d10', type: 'piercing' }, properties: [P.ammunition, P.range(30, 90), P.loading], mastery: 'vex', ammunition: 'Pallottola', weightLb: 3, costCp: gp(250) },
  ]),
];

const AMMO_EN: Record<string, string> = {
  Quadrello: 'Bolt',
  Freccia: 'Arrow',
  'Proiettile da fionda': 'Sling Bullet',
  Ago: 'Needle',
  Pallottola: 'Firearm Bullet',
};

/** Armi SRD nella lingua attiva (in inglese con i nomi ufficiali). */
export const WEAPONS: WeaponBase[] =
  LOCALE === 'en'
    ? WEAPONS_IT.map((w) => ({
        ...w,
        name: w.nameEn,
        ammunition: w.ammunition ? (AMMO_EN[w.ammunition] ?? w.ammunition) : undefined,
      }))
    : WEAPONS_IT;

export const WEAPONS_BY_ID: ReadonlyMap<string, WeaponBase> = new Map(WEAPONS.map((w) => [w.id, w]));

/** Dati arma pronti per un nuovo oggetto d'inventario. */
export function weaponDataFromBase(base: WeaponBase): WeaponData {
  return {
    baseId: base.id,
    category: base.category,
    type: base.type,
    damage: { ...base.damage },
    versatileDice: base.versatileDice,
    properties: base.properties.map((p) => ({ ...p })),
    mastery: base.mastery,
    magicBonus: 0,
    hand: base.properties.some((p) => p.key === 'twoHanded') ? 'two' : 'main',
  };
}
