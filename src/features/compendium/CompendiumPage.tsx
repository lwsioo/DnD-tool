import type { ReactNode } from 'react';
import {
  ARMOR,
  ARMOR_CATEGORY_LABELS,
  armorAcText,
  CONDITION_KEYS,
  CONDITIONS,
  SRD_ATTRIBUTION,
  WEAPON_MASTERIES,
  WEAPON_PROPERTIES,
  WEAPONS,
  type WeaponBase,
} from '@/data/srd';
import type { MasteryKey, WeaponPropertyKey } from '@/domain/items';
import { damageText } from '@/features/inspector/format';
import { MasteryChip, PropertyChips } from '@/features/inspector/renderers/EquipmentRenderers';
import { useOriginLibrary } from '@/features/origins/useOriginLibrary';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatCost, formatWeight } from '@/lib/units';
import { useUiStore } from '@/stores/uiStore';
import { InspectorChip } from '@/ui/InspectorChip';

/** Consultazione rapida della libreria SRD integrata: ogni voce si apre nell'Inspector. */
export function CompendiumPage() {
  const { units } = useAppSettings();

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <p className="text-sm text-muted">
        Regole di riferimento sempre a portata di clic. Seleziona una voce per leggerla nel pannello a destra
        senza lasciare la pagina.
      </p>

      <Block title="Condizioni">
        <div className="flex flex-wrap gap-2">
          {CONDITION_KEYS.map((k) => (
            <InspectorChip key={k} to={{ kind: 'condition', key: k }} title={CONDITIONS[k].summary}>
              {CONDITIONS[k].name}
            </InspectorChip>
          ))}
        </div>
      </Block>

      <div className="grid gap-8 md:grid-cols-2">
        <Block title="Proprietà delle armi">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(WEAPON_PROPERTIES) as WeaponPropertyKey[]).map((k) => (
              <InspectorChip key={k} to={{ kind: 'property', key: k }} title={WEAPON_PROPERTIES[k].summary}>
                {WEAPON_PROPERTIES[k].name}
              </InspectorChip>
            ))}
          </div>
        </Block>
        <Block title="Maestrie nelle armi">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(WEAPON_MASTERIES) as MasteryKey[]).map((k) => (
              <InspectorChip key={k} to={{ kind: 'mastery', key: k }} title={WEAPON_MASTERIES[k].summary}>
                {WEAPON_MASTERIES[k].name}
              </InspectorChip>
            ))}
          </div>
        </Block>
      </div>

      <OriginBlocks />

      <Block title="Armi">
        <WeaponTable weapons={WEAPONS} />
      </Block>

      <Block title="Armature e scudi">
        <Table head={['Armatura', 'Categoria', 'CA', 'Forza', 'Furtività', 'Peso', 'Costo']}>
          {ARMOR.map((a) => (
            <tr key={a.id} className="border-t border-line">
              <td className="py-1.5 pr-3">
                <RowLink to={{ kind: 'armor', id: a.id }}>{a.name}</RowLink>
              </td>
              <td className="pr-3 text-muted">{ARMOR_CATEGORY_LABELS[a.category]}</td>
              <td className="pr-3 tabular-nums">{armorAcText(a)}</td>
              <td className="pr-3 tabular-nums">{a.strRequirement ?? '—'}</td>
              <td className="pr-3">{a.stealthDisadvantage ? 'Svantaggio' : '—'}</td>
              <td className="pr-3 tabular-nums">{formatWeight(a.weightLb, units)}</td>
              <td className="tabular-nums">{formatCost(a.costCp)}</td>
            </tr>
          ))}
        </Table>
      </Block>

      <footer className="border-t border-line pt-4 text-xs text-muted">{SRD_ATTRIBUTION}</footer>
    </div>
  );
}

const imported = (d: { origin: string; sourceBook?: string }) =>
  d.origin !== 'srd' ? ` (${d.sourceBook ?? 'importato'})` : '';

/** Specie, background e talenti: SRD integrati più quelli importati in libreria. */
function OriginBlocks() {
  const lib = useOriginLibrary();
  const groups: Array<
    [
      string,
      Array<{ id: string; name: string; origin: string; sourceBook?: string }>,
      'species' | 'background' | 'feat',
    ]
  > = [
    ['Specie', lib.species, 'species'],
    ['Background', lib.backgrounds, 'background'],
    ['Talenti', lib.feats, 'feat'],
  ];
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {groups.map(([title, list, kind]) => (
        <Block key={kind} title={title}>
          <div className="flex flex-wrap gap-2">
            {list.map((d) => (
              <InspectorChip key={d.id} to={{ kind, id: d.id }}>
                {d.name}
                {imported(d)}
              </InspectorChip>
            ))}
          </div>
        </Block>
      ))}
    </div>
  );
}

function WeaponTable({ weapons }: { weapons: WeaponBase[] }) {
  const { units } = useAppSettings();
  const groups: Array<[string, WeaponBase[]]> = [
    ['Semplici da mischia', weapons.filter((w) => w.category === 'simple' && w.type === 'melee')],
    ['Semplici a distanza', weapons.filter((w) => w.category === 'simple' && w.type === 'ranged')],
    ['Da guerra da mischia', weapons.filter((w) => w.category === 'martial' && w.type === 'melee')],
    ['Da guerra a distanza', weapons.filter((w) => w.category === 'martial' && w.type === 'ranged')],
  ];
  return (
    <Table head={['Arma', 'Danni', 'Proprietà', 'Maestria', 'Peso', 'Costo']}>
      {groups.map(([label, list]) => [
        <tr key={label}>
          <th colSpan={6} className="pt-4 pb-1 text-left text-xs font-semibold text-accent">
            {label}
          </th>
        </tr>,
        ...list.map((w) => (
          <tr key={w.id} className="border-t border-line align-top">
            <td className="py-1.5 pr-3">
              <RowLink to={{ kind: 'weapon', id: w.id }}>{w.name}</RowLink>
            </td>
            <td className="py-1.5 pr-3">{damageText(w)}</td>
            <td className="py-1.5 pr-3">
              <PropertyChips properties={w.properties} units={units} />
            </td>
            <td className="py-1.5 pr-3">
              <MasteryChip mastery={w.mastery} />
            </td>
            <td className="py-1.5 pr-3 tabular-nums">{formatWeight(w.weightLb, units)}</td>
            <td className="py-1.5 tabular-nums">{formatCost(w.costCp)}</td>
          </tr>
        )),
      ])}
    </Table>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="font-display text-lg tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel px-4 py-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            {head.map((h) => (
              <th key={h} className="py-1.5 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function RowLink({ to, children }: { to: Parameters<typeof InspectorChip>[0]['to']; children: ReactNode }) {
  const openInspector = useUiStore((s) => s.openInspector);
  return (
    <button
      type="button"
      onClick={() => openInspector(to)}
      className="text-left font-medium hover:text-accent hover:underline"
    >
      {children}
    </button>
  );
}
