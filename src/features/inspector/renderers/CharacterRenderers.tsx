import { ARMOR_CATEGORY_LABELS } from '@/data/srd/armor';
import type { ID } from '@/domain/primitives';
import { useCharacter } from '@/hooks/useActiveCharacter';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatCost, formatWeight } from '@/lib/units';
import { MarkdownView } from '@/ui/MarkdownView';
import { describeEffect } from '../describeEffect';
import { damageText, FEATURE_CATEGORY_LABELS, ITEM_KIND_LABELS, rechargeText } from '../format';
import { Article, NotFound, Section, StatList } from './Article';
import { MasteryChip, PropertyChips } from './EquipmentRenderers';
import { m } from '@/i18n';

function EffectsList({ effects }: { effects: Parameters<typeof describeEffect>[0][] }) {
  if (effects.length === 0) return null;
  return (
    <Section title={m.inspector.effectsOnSheet}>
      <ul className="list-inside list-disc text-sm text-muted">
        {effects.map((e) => (
          <li key={e.id}>{describeEffect(e)}</li>
        ))}
      </ul>
    </Section>
  );
}

export function FeatureRenderer({ characterId, featureId }: { characterId: ID; featureId: ID }) {
  const { character, status } = useCharacter(characterId);
  if (status === 'loading') return null;
  const f = character?.features.find((x) => x.id === featureId);
  if (!f) return <NotFound what={m.inspector.feature} />;
  return (
    <Article
      title={f.name}
      subtitle={[FEATURE_CATEGORY_LABELS[f.category], f.origin].filter(Boolean).join(' · ')}
    >
      <StatList
        rows={[
          !!f.uses && [m.inspector.uses, m.inspector.usesValue(f.uses.max, f.uses.used)],
          !!f.uses && [m.inspector.recharge, rechargeText(f.uses.recharge)],
          f.toggleable && [m.inspector.status, f.active ? m.inspector.active : m.inspector.inactive],
        ]}
      />
      {f.description ? (
        <MarkdownView compact>{f.description}</MarkdownView>
      ) : (
        <p className="text-sm text-muted">{m.inspector.noDescription}</p>
      )}
      <EffectsList effects={f.effects} />
    </Article>
  );
}

export function ItemRenderer({ characterId, itemId }: { characterId: ID; itemId: ID }) {
  const { units } = useAppSettings();
  const { character, status } = useCharacter(characterId);
  if (status === 'loading') return null;
  const item = character?.inventory.items.find((x) => x.id === itemId);
  if (!item) return <NotFound what={m.inspector.item} />;
  const w = item.weapon;
  const a = item.armor;
  return (
    <Article title={item.name} subtitle={ITEM_KIND_LABELS[item.kind]}>
      <StatList
        rows={[
          !!w && [m.inspector.damage, damageText(w) + (w.magicBonus ? ` · ${m.inspector.magic(w.magicBonus)}` : '')],
          !!w && [m.inspector.properties, <PropertyChips properties={w.properties} units={units} />],
          !!w?.mastery && [m.inspector.mastery, <MasteryChip mastery={w.mastery} />],
          !!a && [m.inspector.armor, `${ARMOR_CATEGORY_LABELS[a.category]} · ${m.inspector.ac(a.baseAc + a.magicBonus)}`],
          !!item.shield && [m.inspector.shield, m.inspector.acBonus(item.shield.acBonus)],
          [m.inspector.quantity, item.quantity],
          item.weightLb !== undefined && [m.inspector.weight, formatWeight(item.weightLb, units)],
          item.valueCp !== undefined && [m.inspector.value, formatCost(item.valueCp)],
          [m.inspector.status, item.equipped ? m.inspector.equipped : m.inspector.inPack],
          !!item.attunement &&
            item.attunement !== 'none' && [
              m.inspector.attunement,
              item.attunement === 'attuned' ? m.inspector.attuned : m.inspector.attunementRequired,
            ],
        ]}
      />
      {item.description && <MarkdownView compact>{item.description}</MarkdownView>}
      <EffectsList effects={item.effects} />
    </Article>
  );
}
