import type { Draft } from 'immer';
import type { ClassBase } from '@/data/srd/classes';
import type { Character, ClassEntry } from '@/domain/character';
import { newId } from '@/lib/id';
import { m } from '@/i18n';

/**
 * Aggiunge una classe. Se è la prima classe del personaggio applica anche ciò che la classe
 * iniziale concede (tiri salvezza, addestramento in armature e armi) e passa i PF al calcolo automatico.
 * Le classi incantatrici aggiungono una fonte da incantatore con la caratteristica predefinita.
 */
export function addClass(d: Draft<Character>, base: ClassBase | null): ClassEntry {
  const entry: ClassEntry = base
    ? { id: newId(), classKey: base.key, name: base.name, level: 1, hitDie: base.hitDie, caster: base.caster }
    : {
        id: newId(),
        classKey: `custom-${Date.now()}`,
        name: m.sheet.newClass,
        level: 1,
        hitDie: 8,
        caster: 'none',
      };
  const isFirst = d.classes.length === 0;
  d.classes.push(entry);

  if (base && isFirst) {
    for (const s of base.saves) if (d.saves[s] === 0) d.saves[s] = 1;
    d.proficiencies.armor = [...new Set([...d.proficiencies.armor, ...base.armor])];
    d.proficiencies.weapons = [...new Set([...d.proficiencies.weapons, ...base.weapons])];
  }
  if (isFirst && d.combat.hp.maxMode === 'manual' && !d.combat.hp.maxManual) {
    d.combat.hp.maxMode = 'auto';
  }
  if (base?.spellcastingAbility) {
    d.spellcasting.sources.push({
      id: newId(),
      label: base.name,
      ability: base.spellcastingAbility,
      classEntryId: entry.id,
    });
  }
  return entry;
}

/** Rimuove una classe e le fonti da incantatore collegate (gli incantesimi restano, senza fonte). */
export function removeClass(d: Draft<Character>, classId: string) {
  d.classes = d.classes.filter((c) => c.id !== classId);
  d.spellcasting.sources = d.spellcasting.sources.filter((s) => s.classEntryId !== classId);
}
