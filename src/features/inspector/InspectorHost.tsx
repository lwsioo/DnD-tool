import { MarkdownView } from '@/ui/MarkdownView';
import type { InspectorRef } from './refs';
import { Article } from './renderers/Article';
import { FeatureRenderer, ItemRenderer } from './renderers/CharacterRenderers';
import { ArmorBaseRenderer, WeaponBaseRenderer } from './renderers/EquipmentRenderers';
import { BackgroundRenderer, FeatRenderer, SpeciesRenderer } from './renderers/OriginRenderers';
import { ConditionRenderer, MasteryRenderer, PropertyRenderer } from './renderers/RuleRenderers';
import { SpellRenderer } from './renderers/SpellRenderer';
import { WikiRenderer } from './renderers/WikiRenderer';

/** Sceglie il renderer giusto per il riferimento corrente dell'Inspector. */
export function InspectorHost({ entry }: { entry: InspectorRef }) {
  switch (entry.kind) {
    case 'property':
      return <PropertyRenderer propertyKey={entry.key} />;
    case 'mastery':
      return <MasteryRenderer masteryKey={entry.key} />;
    case 'condition':
      return <ConditionRenderer conditionKey={entry.key} />;
    case 'weapon':
      return <WeaponBaseRenderer id={entry.id} />;
    case 'armor':
      return <ArmorBaseRenderer id={entry.id} />;
    case 'spell':
      return <SpellRenderer id={entry.id} />;
    case 'species':
      return <SpeciesRenderer id={entry.id} />;
    case 'background':
      return <BackgroundRenderer id={entry.id} />;
    case 'feat':
      return <FeatRenderer id={entry.id} />;
    case 'feature':
      return <FeatureRenderer characterId={entry.characterId} featureId={entry.featureId} />;
    case 'item':
      return <ItemRenderer characterId={entry.characterId} itemId={entry.itemId} />;
    case 'wiki':
      return <WikiRenderer id={entry.id} />;
    case 'text':
      return (
        <Article title={entry.title}>
          <MarkdownView compact>{entry.body}</MarkdownView>
        </Article>
      );
  }
}
