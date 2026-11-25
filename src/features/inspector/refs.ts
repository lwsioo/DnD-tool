import type { ConditionKey } from '@/data/srd/conditions';
import { CONDITIONS } from '@/data/srd/conditions';
import { WEAPON_MASTERIES } from '@/data/srd/weaponMasteries';
import { WEAPON_PROPERTIES } from '@/data/srd/weaponProperties';
import { WEAPONS_BY_ID } from '@/data/srd/weapons';
import { ARMOR_BY_ID } from '@/data/srd/armor';
import type { MasteryKey, WeaponPropertyKey } from '@/domain/items';
import type { ID, Markdown } from '@/domain/primitives';
import { m } from '@/i18n';

/** Cosa può mostrare l'Inspector. Ogni voce è un riferimento leggero, risolto dal renderer. */
export type InspectorRef =
  | { kind: 'property'; key: WeaponPropertyKey }
  | { kind: 'mastery'; key: MasteryKey }
  | { kind: 'condition'; key: ConditionKey }
  /** Arma base della tabella SRD. */
  | { kind: 'weapon'; id: string }
  /** Armatura o scudo base della tabella SRD. */
  | { kind: 'armor'; id: string }
  | { kind: 'spell'; id: ID }
  /** Specie, background e talenti (SRD o libreria). */
  | { kind: 'species'; id: string }
  | { kind: 'background'; id: string }
  | { kind: 'feat'; id: string }
  | { kind: 'feature'; characterId: ID; featureId: ID }
  | { kind: 'item'; characterId: ID; itemId: ID }
  | { kind: 'wiki'; id: ID }
  | { kind: 'text'; title: string; body: Markdown };

export type InspectorKind = InspectorRef['kind'];

export const KIND_LABELS: Record<InspectorKind, string> = m.terms.inspectorKind;

/** Chiave stabile, per non duplicare in cronologia la voce già aperta. */
export function refKey(ref: InspectorRef): string {
  switch (ref.kind) {
    case 'property':
    case 'mastery':
    case 'condition':
      return `${ref.kind}:${ref.key}`;
    case 'weapon':
    case 'armor':
    case 'spell':
    case 'species':
    case 'background':
    case 'feat':
    case 'wiki':
      return `${ref.kind}:${ref.id}`;
    case 'feature':
      return `feature:${ref.characterId}:${ref.featureId}`;
    case 'item':
      return `item:${ref.characterId}:${ref.itemId}`;
    case 'text':
      return `text:${ref.title}`;
  }
}

/**
 * Link interni alle regole usati nei testi markdown: `cond:prone`, `prop:finesse`,
 * `mastery:topple`, `weapon:longsword`, `armor:plate`, `spell:<id>`.
 * Restituisce null per href non riconosciuti o chiavi inesistenti.
 */
export function parseRuleHref(href: string | undefined): InspectorRef | null {
  const m = /^(cond|prop|mastery|weapon|armor|spell):(.+)$/.exec(href ?? '');
  if (!m) return null;
  const [, scheme, value = ''] = m;
  switch (scheme) {
    case 'cond':
      return value in CONDITIONS ? { kind: 'condition', key: value as ConditionKey } : null;
    case 'prop':
      return value in WEAPON_PROPERTIES ? { kind: 'property', key: value as WeaponPropertyKey } : null;
    case 'mastery':
      return value in WEAPON_MASTERIES ? { kind: 'mastery', key: value as MasteryKey } : null;
    case 'weapon':
      return WEAPONS_BY_ID.has(value) ? { kind: 'weapon', id: value } : null;
    case 'armor':
      return ARMOR_BY_ID.has(value) ? { kind: 'armor', id: value } : null;
    case 'spell':
      return { kind: 'spell', id: value };
    default:
      return null;
  }
}

export const RULE_HREF = /^(cond|prop|mastery|weapon|armor|spell):/;
