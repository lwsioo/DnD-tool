import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import type { OriginTrait } from '@/domain/origins';
import { useOriginLibrary } from '@/features/origins/useOriginLibrary';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatDistance } from '@/lib/units';
import { InspectorChip } from '@/ui/InspectorChip';
import { MarkdownView } from '@/ui/MarkdownView';
import { describeEffect } from '../describeEffect';
import { Article, NotFound, Section, StatList } from './Article';

const SIZE = { S: 'Piccola', M: 'Media', L: 'Grande' } as const;
const FEAT_CATEGORY = {
  origin: 'Talento d’origine',
  general: 'Talento generale',
  fightingStyle: 'Stile di combattimento',
  epic: 'Dono epico',
  other: 'Talento',
} as const;

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
  if (!def) return <NotFound what="Specie" />;
  return (
    <Article title={def.name} subtitle={sourceLine('Specie', def)}>
      <StatList
        rows={[
          ['Taglia', def.sizes.map((s) => SIZE[s]).join(' o ')],
          ['Velocità', formatDistance(def.speed, units)],
          !!def.darkvision && ['Scurovisione', formatDistance(def.darkvision, units)],
          !!def.skills?.length && ['Abilità', def.skills.map((s) => SKILL_LABELS[s]).join(', ')],
          !!def.skillChoice && [
            'Abilità a scelta',
            `${def.skillChoice.count}${def.skillChoice.from ? ` tra ${def.skillChoice.from.map((s) => SKILL_LABELS[s]).join(', ')}` : ''}`,
          ],
          !!def.originFeat && ['Talento', 'Un talento d’origine a scelta'],
        ]}
      />
      {def.description && <MarkdownView compact>{def.description}</MarkdownView>}
      <Section title="Tratti">
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
  if (!def) return <NotFound what="Background" />;
  const equipment = def.equipment
    .map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name))
    .join(', ');
  return (
    <Article title={def.name} subtitle={sourceLine('Background', def)}>
      <StatList
        rows={[
          ['Caratteristiche', def.abilities.map((a) => ABILITY_LABELS[a].long).join(', ')],
          [
            'Talento',
            def.featId ? (
              <InspectorChip to={{ kind: 'feat', id: def.featId }}>{def.featName ?? 'Talento'}</InspectorChip>
            ) : (
              (def.featName ?? '—')
            ),
          ],
          ['Abilità', def.skills.map((s) => SKILL_LABELS[s]).join(', ') || '—'],
          ['Strumenti', def.tools.join(', ') || '—'],
          [
            'Equipaggiamento',
            `A: ${equipment}${def.equipmentGoldInA ? `, ${def.equipmentGoldInA} mo` : ''} · B: ${def.equipmentGold} mo`,
          ],
        ]}
      />
      {def.description && <MarkdownView compact>{def.description}</MarkdownView>}
    </Article>
  );
}

export function FeatRenderer({ id }: { id: string }) {
  const def = useOriginLibrary().feats.find((f) => f.id === id);
  if (!def) return <NotFound what="Talento" />;
  return (
    <Article title={def.name} subtitle={sourceLine(FEAT_CATEGORY[def.category], def)}>
      <StatList
        rows={[
          !!def.prerequisite && ['Prerequisito', def.prerequisite],
          !!def.repeatable && ['Ripetibile', 'Sì'],
          !!def.spellLists?.length && ['Liste', def.spellLists.join(', ')],
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
