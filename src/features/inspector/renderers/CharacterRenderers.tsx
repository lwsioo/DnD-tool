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

function EffectsList({ effects }: { effects: Parameters<typeof describeEffect>[0][] }) {
  if (effects.length === 0) return null;
  return (
    <Section title="Effetti sulla scheda">
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
  if (!f) return <NotFound what="Privilegio" />;
  return (
    <Article
      title={f.name}
      subtitle={[FEATURE_CATEGORY_LABELS[f.category], f.origin].filter(Boolean).join(' · ')}
    >
      <StatList
        rows={[
          !!f.uses && ['Usi', `${f.uses.max} (spesi ${f.uses.used})`],
          !!f.uses && ['Ricarica', rechargeText(f.uses.recharge)],
          f.toggleable && ['Stato', f.active ? 'Attivo' : 'Non attivo'],
        ]}
      />
      {f.description ? (
        <MarkdownView compact>{f.description}</MarkdownView>
      ) : (
        <p className="text-sm text-muted">Nessuna descrizione.</p>
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
  if (!item) return <NotFound what="Oggetto" />;
  const w = item.weapon;
  const a = item.armor;
  return (
    <Article title={item.name} subtitle={ITEM_KIND_LABELS[item.kind]}>
      <StatList
        rows={[
          !!w && ['Danni', damageText(w) + (w.magicBonus ? ` · +${w.magicBonus} magico` : '')],
          !!w && ['Proprietà', <PropertyChips properties={w.properties} units={units} />],
          !!w?.mastery && ['Maestria', <MasteryChip mastery={w.mastery} />],
          !!a && ['Armatura', `${ARMOR_CATEGORY_LABELS[a.category]} · CA ${a.baseAc + a.magicBonus}`],
          !!item.shield && ['Scudo', `+${item.shield.acBonus} CA`],
          ['Quantità', item.quantity],
          item.weightLb !== undefined && ['Peso', formatWeight(item.weightLb, units)],
          item.valueCp !== undefined && ['Valore', formatCost(item.valueCp)],
          ['Stato', item.equipped ? 'Equipaggiato' : 'Nello zaino'],
          !!item.attunement &&
            item.attunement !== 'none' && [
              'Sintonia',
              item.attunement === 'attuned' ? 'Sintonizzato' : 'Richiesta (non sintonizzato)',
            ],
        ]}
      />
      {item.description && <MarkdownView compact>{item.description}</MarkdownView>}
      <EffectsList effects={item.effects} />
    </Article>
  );
}
