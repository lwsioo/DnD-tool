import type { Spell } from '@/domain/spells';
import { newId } from '@/lib/id';

/** Incantesimo personalizzato vuoto. */
export function blankSpell(): Spell {
  const now = Date.now();
  return {
    id: newId(),
    origin: 'custom',
    name: '',
    nameKey: '',
    level: 1,
    school: 'evocation',
    castingTime: { amount: 1, unit: 'action' },
    ritual: false,
    range: { kind: 'distance', distance: 60 },
    components: { v: true, s: true, m: false },
    duration: { kind: 'instant', concentration: false },
    description: '',
    classes: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}
