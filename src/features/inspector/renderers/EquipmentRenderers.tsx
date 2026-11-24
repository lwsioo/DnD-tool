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
      title={unlocked ? undefined : 'Maestria non sbloccata per questo personaggio'}
    >
      {WEAPON_MASTERIES[mastery].name}
    </InspectorChip>
  );
}

export function WeaponBaseRenderer({ id }: { id: string }) {
  const { units } = useAppSettings();
  const w = WEAPONS_BY_ID.get(id);
  if (!w) return <NotFound what="Arma" />;
  const kind = `Arma ${w.category === 'simple' ? 'semplice' : 'da guerra'} ${w.type === 'melee' ? 'da mischia' : 'a distanza'}`;
  return (
    <Article title={w.name} subtitle={`${kind} · ${w.nameEn}`}>
      <StatList
        rows={[
          ['Danni', damageText(w)],
          ['Proprietà', <PropertyChips properties={w.properties} units={units} />],
          ['Maestria', <MasteryChip mastery={w.mastery} />],
          !!w.ammunition && ['Munizione', w.ammunition],
          ['Peso', formatWeight(w.weightLb, units)],
          ['Costo', formatCost(w.costCp)],
        ]}
      />
    </Article>
  );
}

export function ArmorBaseRenderer({ id }: { id: string }) {
  const { units } = useAppSettings();
  const a = ARMOR_BY_ID.get(id);
  if (!a) return <NotFound what="Armatura" />;
  return (
    <Article title={a.name} subtitle={`${ARMOR_CATEGORY_LABELS[a.category]} · ${a.nameEn}`}>
      <StatList
        rows={[
          ['Classe Armatura', armorAcText(a)],
          !!a.strRequirement && ['Forza', `${a.strRequirement} (altrimenti −3 m di velocità)`],
          ['Furtività', a.stealthDisadvantage ? 'Svantaggio' : '—'],
          ['Peso', formatWeight(a.weightLb, units)],
          ['Costo', formatCost(a.costCp)],
          ['Indossare', a.don],
          ['Togliere', a.doff],
        ]}
      />
      <p className="text-xs text-muted">
        {a.category === 'shield'
          ? 'Il bonus alla CA dello scudo vale solo se hai l’addestramento con gli scudi.'
          : 'Senza addestramento in questa categoria hai svantaggio ai tiri d20 basati su Forza o Destrezza e non puoi lanciare incantesimi.'}
      </p>
    </Article>
  );
}
