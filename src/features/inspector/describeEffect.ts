import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import type { Ability, SkillKey } from '@/domain/abilities';
import type { Effect, EffectRequirement, EffectTarget } from '@/domain/effects';
import { m } from '@/i18n';

const T = m.terms.targets;

const FIXED_TARGETS: Partial<Record<EffectTarget, string>> = {
  ac: T.ac,
  'ac.formula': T.ac,
  initiative: T.initiative,
  speed: T.speed,
  'hp.max': T.hpMax,
  'passive.perception': T.passivePerception,
  'save.all': T.saveAll,
  'attack.all': T.attackAll,
  'attack.melee': T.attackMelee,
  'attack.ranged': T.attackRanged,
  'damage.melee': T.damageMelee,
  'damage.ranged': T.damageRanged,
  'spell.dc': T.spellDc,
  'spell.attack': T.spellAttack,
  'd20.all': T.d20All,
};

export function targetLabel(target: EffectTarget): string {
  const fixed = FIXED_TARGETS[target];
  if (fixed) return fixed;
  const [kind, key] = target.split('.') as [string, string];
  if (kind === 'skill') return SKILL_LABELS[key as SkillKey];
  const ability = ABILITY_LABELS[key as Ability]?.long ?? key;
  if (kind === 'save') return T.save(ability);
  if (kind === 'check') return T.check(ability);
  if (kind === 'score') return ability;
  return target;
}

const REQUIREMENT_LABELS: Record<EffectRequirement, string> = m.terms.requirements;

/** Descrizione leggibile di un effetto: "+1 a CA (con armatura)", "Vantaggio a Furtività". */
export function describeEffect(e: Effect): string {
  const label = targetLabel(e.target);
  const value = e.value ?? '';
  const signed = /^-/.test(value.trim()) ? value.trim() : `+${value.trim()}`;
  const E = m.terms.effect;
  let text: string;
  switch (e.op) {
    case 'add':
      text = E.add(signed, label);
      break;
    case 'set':
      text = e.target.startsWith('score.') ? E.atLeast(label, value) : `${label} = ${value}`;
      break;
    case 'formula':
      text = `${label} = ${value}`;
      break;
    case 'advantage':
      text = E.advantage(label);
      break;
    case 'disadvantage':
      text = E.disadvantage(label);
      break;
    case 'proficiency':
      text = E.proficiency(label);
      break;
    case 'expertise':
      text = E.expertise(label);
      break;
  }
  const req = e.requires?.map((r) => REQUIREMENT_LABELS[r]).join(', ');
  return req ? `${text} (${req})` : text;
}
