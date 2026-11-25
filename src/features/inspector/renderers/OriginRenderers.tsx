import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import type { OriginTrait } from '@/domain/origins';
import { useOriginLibrary } from '@/features/origins/useOriginLibrary';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatDistance } from '@/lib/units';
import { InspectorChip } from '@/ui/InspectorChip';
import { MarkdownView } from '@/ui/MarkdownView';
import { describeEffect } from '../describeEffect';
import { Article, NotFound, Section, StatList } from './Article';
import { m } from '@/i18n';

const SIZE = m.terms.sizes;
const FEAT_CATEGORY = {
  ...m.inspector.featCategory,
};

const sourceLine = (kind: string, d: { nameEn?: string; name: string; sourceBook?: string }) =>
  [kind, d.nameEn && d.nameEn !== d.name ? d.nameEn : null, d.sourceBook].filter(Boolean).join(' · ');

function Traits({ traits }: { traits: OriginTrait[] }) {
  return (
    <div className="space-y-3">
      {traits.map((t) => (
        <div key={t.name} className="space-y-1">
          <h4 className="text-sm font-semibold">
            {t.name}
            {t.minLevel && (
              <span className="ml-1 text-xs font-normal text-muted">(dal {t.minLevel}° livello)</span>
            )}
          </h4>
          <MarkdownView compact>{t.description}</MarkdownView>
          {t.effects?.length ? (
            <p className="text-xs text-accent">
              {t.effects.map((e) => describeEffect({ ...e, id: '' })).join(' · ')}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function SpeciesRenderer({ id }: { id: string }) {
  const { units } = useAppSettings();
  const def = useOriginLibrary().species.find((s) => s.id === id);
  if (!def) return <NotFound what={m.inspector.species} />;
  return (
    <Article title={def.name} subtitle={sourceLine(m.inspector.species, def)}>
      <StatList
        rows={[
          [m.inspector.size, def.sizes.map((s) => SIZE[s]).join(m.inspector.sizeOr)],
          [m.inspector.speed, formatDistance(def.speed, units)],
          !!def.darkvision && [m.inspector.darkvision, formatDistance(def.darkvision, units)],
          !!def.skills?.length && [m.inspector.skills, def.skills.map((s) => SKILL_LABELS[s]).join(', ')],
          !!def.skillChoice && [
            m.inspector.skillChoice,
            `${def.skillChoice.count}${def.skillChoice.from ? m.inspector.among(def.skillChoice.from.map((s) => SKILL_LABELS[s]).join(', ')) : ''}`,
          ],
          !!def.originFeat && [m.inspector.feat, m.inspector.originFeatChoice],
        ]}
      />
      {def.description && <MarkdownView compact>{def.description}</MarkdownView>}
      <Section title={m.inspector.traits}>
        <Traits traits={def.traits} />
      </Section>
      {def.choice && (
        <Section title={def.choice.label}>
          {def.choice.options.map((o) => (
            <div key={o.key} className="space-y-1 rounded-lg border border-line p-2">
              <p className="text-sm font-medium">{o.name}</p>
              <Traits traits={o.traits} />
            </div>
          ))}
        </Section>
      )}
    </Article>
  );
}

export function BackgroundRenderer({ id }: { id: string }) {
  const def = useOriginLibrary().backgrounds.find((b) => b.id === id);
  if (!def) return <NotFound what={m.inspector.background} />;
  const equipment = def.equipment
    .map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name))
    .join(', ');
  return (
    <Article title={def.name} subtitle={sourceLine(m.inspector.background, def)}>
      <StatList
        rows={[
          [m.inspector.abilities, def.abilities.map((a) => ABILITY_LABELS[a].long).join(', ')],
          [
            m.inspector.feat,
            def.featId ? (
              <InspectorChip to={{ kind: 'feat', id: def.featId }}>{def.featName ?? m.inspector.feat}</InspectorChip>
            ) : (
              (def.featName ?? '—')
            ),
          ],
          [m.inspector.skills, def.skills.map((s) => SKILL_LABELS[s]).join(', ') || '—'],
          [m.inspector.tools, def.tools.join(', ') || '—'],
          [
            m.inspector.equipment,
            `A: ${equipment}${def.equipmentGoldInA ? `, ${def.equipmentGoldInA} ${m.inspector.gp}` : ''} · B: ${def.equipmentGold} ${m.inspector.gp}`,
          ],
        ]}
      />
      {def.description && <MarkdownView compact>{def.description}</MarkdownView>}
    </Article>
  );
}

export function FeatRenderer({ id }: { id: string }) {
  const def = useOriginLibrary().feats.find((f) => f.id === id);
  if (!def) return <NotFound what={m.inspector.feat} />;
  return (
    <Article title={def.name} subtitle={sourceLine(FEAT_CATEGORY[def.category], def)}>
      <StatList
        rows={[
          !!def.prerequisite && [m.inspector.prerequisite, def.prerequisite],
          !!def.repeatable && [m.inspector.repeatable, m.inspector.yes],
          !!def.spellLists?.length && [m.inspector.lists, def.spellLists.join(', ')],
        ]}
      />
      <MarkdownView compact>{def.description}</MarkdownView>
      {def.effects?.length ? (
        <p className="text-xs text-accent">
          {def.effects.map((e) => describeEffect({ ...e, id: '' })).join(' · ')}
        </p>
      ) : null}
    </Article>
  );
}
