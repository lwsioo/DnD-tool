import { ARMOR_BY_ID, ARMOR_CATEGORY_LABELS, armorAcText } from '@/data/srd/armor';
import { WEAPON_MASTERIES } from '@/data/srd/weaponMasteries';
import { WEAPON_PROPERTIES } from '@/data/srd/weaponProperties';
import { WEAPONS_BY_ID } from '@/data/srd/weapons';
import type { MasteryKey, WeaponPropertyRef } from '@/domain/items';
import { damageText } from '../format';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatCost, formatRange, formatWeight, type Units } from '@/lib/units';
import { InspectorChip } from '@/ui/InspectorChip';
import { Article, NotFound, StatList } from './Article';
import { m } from '@/i18n';

/** Etichette di proprietà cliccabili, con la gittata per Lancio/Gittata: "Lancio (6/18 m)". */
export function PropertyChips({ properties, units }: { properties: WeaponPropertyRef[]; units: Units }) {
  if (properties.length === 0) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {properties.map((p) => (
        <InspectorChip key={p.key} to={{ kind: 'property', key: p.key }}>
          {WEAPON_PROPERTIES[p.key].name}
          {'normal' in p && ` (${formatRange(p.normal, p.long, units)})`}
        </InspectorChip>
      ))}
    </span>
  );
}

export function MasteryChip({ mastery, unlocked = true }: { mastery: MasteryKey; unlocked?: boolean }) {
  return (
    <InspectorChip
      to={{ kind: 'mastery', key: mastery }}
      muted={!unlocked}
      title={unlocked ? undefined : m.inspector.masteryLocked}
    >
      {WEAPON_MASTERIES[mastery].name}
    </InspectorChip>
  );
}

export function WeaponBaseRenderer({ id }: { id: string }) {
  const { units } = useAppSettings();
  const w = WEAPONS_BY_ID.get(id);
  if (!w) return <NotFound what={m.inspector.weapon} />;
  const kind = m.inspector.weaponKind(w.category === 'simple', w.type === 'melee');
  return (
    <Article title={w.name} subtitle={m.inspector.kindLine(kind, w.name, w.nameEn)}>
      <StatList
        rows={[
          [m.inspector.damage, damageText(w)],
          [m.inspector.properties, <PropertyChips properties={w.properties} units={units} />],
          [m.inspector.mastery, <MasteryChip mastery={w.mastery} />],
          !!w.ammunition && [m.inspector.ammunition, w.ammunition],
          [m.inspector.weight, formatWeight(w.weightLb, units)],
          [m.inspector.cost, formatCost(w.costCp)],
        ]}
      />
    </Article>
  );
}

export function ArmorBaseRenderer({ id }: { id: string }) {
  const { units } = useAppSettings();
  const a = ARMOR_BY_ID.get(id);
  if (!a) return <NotFound what={m.inspector.armor} />;
  return (
    <Article title={a.name} subtitle={m.inspector.kindLine(ARMOR_CATEGORY_LABELS[a.category], a.name, a.nameEn)}>
      <StatList
        rows={[
          [m.inspector.armorClass, armorAcText(a)],
          !!a.strRequirement && [m.inspector.strength, m.inspector.strengthReq(a.strRequirement)],
          [m.inspector.stealth, a.stealthDisadvantage ? m.inspector.disadvantage : '—'],
          [m.inspector.weight, formatWeight(a.weightLb, units)],
          [m.inspector.cost, formatCost(a.costCp)],
          [m.inspector.don, a.don],
          [m.inspector.doff, a.doff],
        ]}
      />
      <p className="text-xs text-muted">
        {a.category === 'shield'
          ? m.inspector.shieldNote
          : m.inspector.armorNote}
      </p>
    </Article>
  );
}
