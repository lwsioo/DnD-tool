import { ARMOR } from '@/data/srd/armor';
import { CONDITION_KEYS, CONDITIONS } from '@/data/srd/conditions';
import { WEAPON_MASTERIES } from '@/data/srd/weaponMasteries';
import { WEAPON_PROPERTIES } from '@/data/srd/weaponProperties';
import { WEAPONS } from '@/data/srd/weapons';
import type { MasteryKey, WeaponPropertyKey } from '@/domain/items';
import type { ID } from '@/domain/primitives';
import type { WikiCategory } from '@/domain/wiki';
import type { InspectorRef } from '@/features/inspector/refs';
import { normalizeKey } from '@/lib/normalizeKey';

export interface WikiTarget {
  id: ID;
  campaignId: ID;
  title: string;
  category: WikiCategory;
}

export type ResolvedLink =
  { kind: 'wiki'; entry: WikiTarget } | { kind: 'ref'; ref: InspectorRef; label: string };

export interface LinkIndex {
  wiki: Map<string, WikiTarget>;
  spells: Map<string, { id: ID; name: string }>;
}

/** Regole della libreria statica raggiungibili con un [[collegamento]], per nome italiano o inglese. */
export const RULE_INDEX: ReadonlyMap<string, { ref: InspectorRef; label: string }> = (() => {
  const map = new Map<string, { ref: InspectorRef; label: string }>();
  const add = (names: string[], ref: InspectorRef, label: string) => {
    for (const n of names) map.set(normalizeKey(n), { ref, label });
  };
  for (const k of CONDITION_KEYS)
    add([CONDITIONS[k].name, CONDITIONS[k].nameEn], { kind: 'condition', key: k }, CONDITIONS[k].name);
  for (const k of Object.keys(WEAPON_PROPERTIES) as WeaponPropertyKey[]) {
    const p = WEAPON_PROPERTIES[k];
    add([p.name, p.nameEn], { kind: 'property', key: k }, p.name);
  }
  for (const k of Object.keys(WEAPON_MASTERIES) as MasteryKey[]) {
    const m = WEAPON_MASTERIES[k];
    add([m.name, m.nameEn], { kind: 'mastery', key: k }, m.name);
  }
  for (const w of WEAPONS) add([w.name, w.nameEn], { kind: 'weapon', id: w.id }, w.name);
  for (const a of ARMOR) add([a.name, a.nameEn], { kind: 'armor', id: a.id }, a.name);
  return map;
})();

/**
 * Risolve la destinazione di un [[collegamento]]: prima le voci della campagna (titolo o alias),
 * poi gli incantesimi della libreria (nome italiano o inglese), infine le regole SRD.
 */
export function resolveTarget(target: string, index: LinkIndex): ResolvedLink | null {
  const key = normalizeKey(target);
  const entry = index.wiki.get(key);
  if (entry) return { kind: 'wiki', entry };
  const spell = index.spells.get(key);
  if (spell) return { kind: 'ref', ref: { kind: 'spell', id: spell.id }, label: spell.name };
  const rule = RULE_INDEX.get(key);
  if (rule) return { kind: 'ref', ...rule };
  return null;
}
