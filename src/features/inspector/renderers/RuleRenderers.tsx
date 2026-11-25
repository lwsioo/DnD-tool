import { CONDITIONS, type ConditionKey } from '@/data/srd/conditions';
import { WEAPON_MASTERIES } from '@/data/srd/weaponMasteries';
import { WEAPON_PROPERTIES } from '@/data/srd/weaponProperties';
import { WEAPONS } from '@/data/srd/weapons';
import type { MasteryKey, WeaponPropertyKey } from '@/domain/items';
import { InspectorChip } from '@/ui/InspectorChip';
import { MarkdownView } from '@/ui/MarkdownView';
import { describeEffect } from '../describeEffect';
import { Article, Section } from './Article';
import { m as msg } from '@/i18n';

function WeaponChips({ ids }: { ids: Array<{ id: string; name: string }> }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((w) => (
        <InspectorChip key={w.id} to={{ kind: 'weapon', id: w.id }} muted>
          {w.name}
        </InspectorChip>
      ))}
    </div>
  );
}

export function PropertyRenderer({ propertyKey }: { propertyKey: WeaponPropertyKey }) {
  const p = WEAPON_PROPERTIES[propertyKey];
  const weapons = WEAPONS.filter((w) => w.properties.some((x) => x.key === propertyKey));
  return (
    <Article title={p.name} subtitle={msg.inspector.kindLine(msg.inspector.weaponProperty, p.name, p.nameEn)}>
      <MarkdownView compact>{p.body}</MarkdownView>
      {weapons.length > 0 && (
        <Section title={msg.inspector.srdWithProperty}>
          <WeaponChips ids={weapons} />
        </Section>
      )}
    </Article>
  );
}

export function MasteryRenderer({ masteryKey }: { masteryKey: MasteryKey }) {
  const m = WEAPON_MASTERIES[masteryKey];
  return (
    <Article title={m.name} subtitle={msg.inspector.kindLine(msg.inspector.weaponMastery, m.name, m.nameEn)}>
      <MarkdownView compact>{m.body}</MarkdownView>
      <p className="text-xs text-muted">
        Puoi usare la proprietà di maestria di un'arma solo se un privilegio te ne ha concesso l'uso (es.
        Maestria nelle Armi di Guerriero, Barbaro, Paladino, Ranger e Ladro).
      </p>
      <Section title={msg.inspector.srdWithMastery}>
        <WeaponChips ids={WEAPONS.filter((w) => w.mastery === masteryKey)} />
      </Section>
    </Article>
  );
}

export function ConditionRenderer({ conditionKey }: { conditionKey: ConditionKey }) {
  const c = CONDITIONS[conditionKey];
  return (
    <Article title={c.name} subtitle={msg.inspector.kindLine(msg.inspector.condition, c.name, c.nameEn)}>
      <MarkdownView compact>{c.body}</MarkdownView>
      {c.effects.length > 0 && (
        <Section title={msg.inspector.autoApplied}>
          <ul className="list-inside list-disc text-sm text-muted">
            {[...new Set(c.effects.map(describeEffect))].map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Section>
      )}
    </Article>
  );
}
