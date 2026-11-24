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

export function SpellRenderer({ id }: { id: ID }) {
  const { units } = useAppSettings();
  const spell = useLiveQuery(async () => (await db.spells.get(id)) ?? null, [id]);
  if (spell === undefined) return null;
  if (spell === null) return <NotFound what="Incantesimo" />;

  const tags = [
    spell.duration.concentration && 'Concentrazione',
    spell.ritual && 'Rituale',
    spell.components.m && 'Materiali',
  ].filter(Boolean);

  return (
    <Article
      title={spell.name}
      subtitle={[spellLevelLine(spell), spell.nameEn, spell.sourceBook].filter(Boolean).join(' · ')}
    >
      <StatList
        rows={[
          ['Tempo di lancio', castingTimeText(spell.castingTime) + (spell.ritual ? ' o rituale' : '')],
          ['Gittata', rangeText(spell.range, units)],
          ['Componenti', componentsText(spell.components)],
          ['Durata', durationText(spell.duration)],
          spell.classes.length > 0 && ['Classi', spell.classes.join(', ')],
        ]}
      />
      {tags.length > 0 && <p className="text-xs text-muted">{tags.join(' · ')}</p>}
      <MarkdownView compact>{spell.description}</MarkdownView>
      {spell.higherLevels && (
        <div className="rounded-lg border border-accent/40 bg-accent-soft/40 p-3">
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-accent uppercase">
            {spell.level === 0 ? 'Potenziamento del trucchetto' : 'A livelli superiori'}
          </h3>
          <MarkdownView compact>{spell.higherLevels}</MarkdownView>
        </div>
      )}
    </Article>
  );
}
