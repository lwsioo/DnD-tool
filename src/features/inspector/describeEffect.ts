import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import type { Ability, SkillKey } from '@/domain/abilities';
import type { Effect, EffectRequirement, EffectTarget } from '@/domain/effects';

const FIXED_TARGETS: Partial<Record<EffectTarget, string>> = {
  ac: 'CA',
  'ac.formula': 'CA',
  initiative: 'Iniziativa',
  speed: 'Velocità',
  'hp.max': 'PF massimi',
  'passive.perception': 'Percezione passiva',
  'save.all': 'tutti i tiri salvezza',
  'attack.all': 'tutti i tiri per colpire',
  'attack.melee': 'tiri per colpire in mischia',
  'attack.ranged': 'tiri per colpire a distanza',
  'damage.melee': 'danni in mischia',
  'damage.ranged': 'danni a distanza',
  'spell.dc': 'CD degli incantesimi',
  'spell.attack': 'attacchi con incantesimo',
  'd20.all': 'tutti i tiri d20',
};

export function targetLabel(target: EffectTarget): string {
  const fixed = FIXED_TARGETS[target];
  if (fixed) return fixed;
  const [kind, key] = target.split('.') as [string, string];
  if (kind === 'skill') return SKILL_LABELS[key as SkillKey];
  const ability = ABILITY_LABELS[key as Ability]?.long ?? key;
  if (kind === 'save') return `TS su ${ability}`;
  if (kind === 'check') return `prove di ${ability}`;
  if (kind === 'score') return ability;
  return target;
}

const REQUIREMENT_LABELS: Record<EffectRequirement, string> = {
  noArmor: 'senza armatura',
  noShield: 'senza scudo',
  armorEquipped: 'con armatura',
  shieldEquipped: 'con scudo',
};

/** Descrizione leggibile di un effetto: "+1 a CA (con armatura)", "Vantaggio a Furtività". */
export function describeEffect(e: Effect): string {
  const label = targetLabel(e.target);
  const value = e.value ?? '';
  const signed = /^-/.test(value.trim()) ? value.trim() : `+${value.trim()}`;
  let text: string;
  switch (e.op) {
    case 'add':
      text = `${signed} a ${label}`;
      break;
    case 'set':
      text = e.target.startsWith('score.') ? `${label} almeno ${value}` : `${label} = ${value}`;
      break;
    case 'formula':
      text = `${label} = ${value}`;
      break;
    case 'advantage':
      text = `Vantaggio a ${label}`;
      break;
    case 'disadvantage':
      text = `Svantaggio a ${label}`;
      break;
    case 'proficiency':
      text = `Competenza in ${label}`;
      break;
    case 'expertise':
      text = `Maestria in ${label}`;
      break;
  }
  const req = e.requires?.map((r) => REQUIREMENT_LABELS[r]).join(', ');
  return req ? `${text} (${req})` : text;
}
