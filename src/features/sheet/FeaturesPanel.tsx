import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Feature, FeatureCategory } from '@/domain/character';
import { rechargeText } from '@/features/inspector/format';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { UsesCounter } from '@/ui/Pips';
import { Tabs } from '@/ui/Tabs';
import { FeatureEditor } from './FeatureEditor';
import { ProficienciesPanel } from './ProficienciesPanel';
import { useSheet } from './SheetContext';
import { m } from '@/i18n';

type TabKey = 'class' | 'species' | 'feats' | 'proficiencies';

const TAB_CATEGORIES: Record<Exclude<TabKey, 'proficiencies'>, FeatureCategory[]> = {
  class: ['class', 'subclass'],
  species: ['species'],
  feats: ['feat', 'background', 'other'],
};
const DEFAULT_CATEGORY: Record<Exclude<TabKey, 'proficiencies'>, FeatureCategory> = {
  class: 'class',
  species: 'species',
  feats: 'feat',
};

/** Privilegi di classe, tratti della specie, talenti e competenze, a schede. */
export function FeaturesPanel() {
  const { character: c } = useSheet();
  const [tab, setTab] = useState<TabKey>('class');
  const count = (k: Exclude<TabKey, 'proficiencies'>) =>
    c.features.filter((f) => TAB_CATEGORIES[k].includes(f.category)).length;

  return (
    <section aria-label={m.sheet.featuresRegion} className="rounded-xl border border-line bg-panel p-4">
      <Tabs
        label={m.sheet.featuresRegion}
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'class', label: m.sheet.tabClass, count: count('class') },
          { key: 'species', label: m.sheet.tabSpecies, count: count('species') },
          { key: 'feats', label: m.sheet.tabFeats, count: count('feats') },
          { key: 'proficiencies', label: m.sheet.tabProficiencies },
        ]}
      >
        {tab === 'proficiencies' ? <ProficienciesPanel /> : <FeatureList tab={tab} />}
      </Tabs>
    </section>
  );
}

function FeatureList({ tab }: { tab: Exclude<TabKey, 'proficiencies'> }) {
  const { character: c, derived: d, edit, mutate } = useSheet();
  const [editing, setEditing] = useState<Feature | 'new' | null>(null);
  const features = c.features.filter((f) => TAB_CATEGORIES[tab].includes(f.category));

  const save = (f: Feature) => {
    mutate((x) => {
      const i = x.features.findIndex((y) => y.id === f.id);
      if (i >= 0) x.features[i] = f;
      else x.features.push(f);
    });
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      {features.length === 0 && (
        <p className="text-sm text-muted">
          {m.sheet.noEntries}
          {edit ? '' : m.sheet.editToAdd}
        </p>
      )}
      <ul className="divide-y divide-line">
        {features.map((f) => (
          <FeatureRow
            key={f.id}
            feature={f}
            resource={d.resources.find((r) => r.id === f.id)}
            onEdit={() => setEditing(f)}
          />
        ))}
      </ul>
      {edit && (
        <Button size="sm" icon={Plus} onClick={() => setEditing('new')}>
          {m.common.add}
        </Button>
      )}
      {editing && (
        <FeatureEditor
          feature={editing === 'new' ? null : editing}
          defaultCategory={DEFAULT_CATEGORY[tab]}
          vars={d.vars}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function FeatureRow({
  feature: f,
  resource,
  onEdit,
}: {
  feature: Feature;
  resource?: { max: number; used: number; formulaError: boolean };
  onEdit: () => void;
}) {
  const { character: c, edit, mutate } = useSheet();
  const openInspector = useUiStore((s) => s.openInspector);
  const update = (recipe: (x: Feature) => void) =>
    mutate((d) => {
      const target = d.features.find((y) => y.id === f.id);
      if (target) recipe(target);
    });

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <div className="min-w-40 flex-1">
        <button
          type="button"
          onClick={() => openInspector({ kind: 'feature', characterId: c.id, featureId: f.id })}
          className="text-left text-sm font-medium hover:text-accent hover:underline"
        >
          {f.name}
        </button>
        {f.origin && <span className="ml-2 text-xs text-muted">{f.origin}</span>}
        {f.uses && <div className="text-[11px] text-muted">{rechargeText(f.uses.recharge)}</div>}
      </div>

      {f.toggleable && (
        <button
          type="button"
          role="switch"
          aria-checked={f.active}
          aria-label={m.sheet.featureActive(f.name)}
          onClick={() => update((x) => void (x.active = !x.active))}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
            f.active ? 'border-accent bg-accent text-accent-ink' : 'border-line text-muted hover:text-ink',
          )}
        >
          {f.active ? m.sheet.active : m.sheet.inactive}
        </button>
      )}

      {f.uses &&
        resource &&
        (resource.formulaError ? (
          <span className="text-xs text-danger" title={m.sheet.invalidFormula(f.uses.max)}>
            {m.sheet.invalidFormulaShort}
          </span>
        ) : (
          <UsesCounter
            label={f.name}
            max={resource.max}
            used={Math.min(resource.used, resource.max)}
            onUsed={(used) => update((x) => void (x.uses!.used = used))}
          />
        ))}

      {edit && (
        <span className="flex">
          <IconButton icon={Pencil} label={m.sheet.editX(f.name)} onClick={onEdit} />
          <IconButton
            icon={Trash2}
            label={m.sheet.deleteX(f.name)}
            onClick={() => {
              const index = c.features.findIndex((y) => y.id === f.id);
              mutate((d) => void (d.features = d.features.filter((y) => y.id !== f.id)));
              toast({
                message: m.sheet.deleted(f.name),
                action: {
                  label: m.common.undo,
                  onClick: () => mutate((d) => void d.features.splice(Math.max(0, index), 0, f)),
                },
              });
            }}
          />
        </span>
      )}
    </li>
  );
}
