import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { ID } from '@/domain/primitives';
import {
  castingTimeText,
  componentsText,
  durationText,
  rangeText,
  spellLevelLine,
} from '@/features/grimoire/spellText';
import { useAppSettings } from '@/hooks/useAppSettings';
import { MarkdownView } from '@/ui/MarkdownView';
import { Article, NotFound, StatList } from './Article';
import { m } from '@/i18n';

export function SpellRenderer({ id }: { id: ID }) {
  const { units } = useAppSettings();
  const spell = useLiveQuery(async () => (await db.spells.get(id)) ?? null, [id]);
  if (spell === undefined) return null;
  if (spell === null) return <NotFound what={m.inspector.spell} />;

  const tags = [
    spell.duration.concentration && m.inspector.concentration,
    spell.ritual && m.inspector.ritual,
    spell.components.m && m.inspector.materials,
  ].filter(Boolean);

  return (
    <Article
      title={spell.name}
      subtitle={[spellLevelLine(spell), spell.nameEn, spell.sourceBook].filter(Boolean).join(' · ')}
    >
      <StatList
        rows={[
          [m.inspector.castingTime, castingTimeText(spell.castingTime) + (spell.ritual ? m.inspector.orRitual : '')],
          [m.inspector.range, rangeText(spell.range, units)],
          [m.inspector.components, componentsText(spell.components)],
          [m.inspector.duration, durationText(spell.duration)],
          spell.classes.length > 0 && [m.inspector.classes, spell.classes.join(', ')],
        ]}
      />
      {tags.length > 0 && <p className="text-xs text-muted">{tags.join(' · ')}</p>}
      <MarkdownView compact>{spell.description}</MarkdownView>
      {spell.higherLevels && (
        <div className="rounded-lg border border-accent/40 bg-accent-soft/40 p-3">
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-accent uppercase">
            {spell.level === 0 ? m.inspector.cantripUpgrade : m.inspector.higherLevels}
          </h3>
          <MarkdownView compact>{spell.higherLevels}</MarkdownView>
        </div>
      )}
    </Article>
  );
}
