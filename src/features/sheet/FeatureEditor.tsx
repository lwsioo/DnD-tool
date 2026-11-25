import { useState } from 'react';
import type { Feature, FeatureCategory } from '@/domain/character';
import type { FormulaVars } from '@/engine/formula';
import { FEATURE_CATEGORY_LABELS } from '@/features/inspector/format';
import { newId } from '@/lib/id';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { FieldLabel, inputClass, Select } from '@/ui/fields';
import { EffectsEditor, FormulaPreview } from './EffectsEditor';
import { m } from '@/i18n';

type RechargeChoice = 'none' | 'all' | 'one';
const toChoice = (v: 'all' | number): RechargeChoice => (v === 'all' ? 'all' : v > 0 ? 'one' : 'none');
const fromChoice = (c: RechargeChoice): 'all' | number => (c === 'all' ? 'all' : c === 'one' ? 1 : 0);
const RECHARGE_OPTIONS = [
  { value: 'none' as const, label: m.sheet.rechargeNone },
  { value: 'one' as const, label: '1 uso' },
  { value: 'all' as const, label: m.sheet.rechargeAll },
];

interface FeatureEditorProps {
  feature: Feature | null;
  defaultCategory: FeatureCategory;
  vars: FormulaVars;
  onSave: (f: Feature) => void;
  onClose: () => void;
}

/** Crea o modifica un privilegio/tratto/talento: descrizione, usi a ricarica ed effetti sulla scheda. */
export function FeatureEditor({ feature, defaultCategory, vars, onSave, onClose }: FeatureEditorProps) {
  const [draft, setDraft] = useState<Feature>(
    () =>
      feature ?? {
        id: newId(),
        category: defaultCategory,
        name: '',
        description: '',
        effects: [],
        toggleable: false,
        active: true,
      },
  );
  const set = (patch: Partial<Feature>) => setDraft((d) => ({ ...d, ...patch }));

  const valid = draft.name.trim().length > 0;

  return (
    <Dialog
      open
      onClose={onClose}
      title={feature ? m.sheet.editFeature(feature.name) : m.sheet.newFeature}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
          >
            Salva
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <FieldLabel label={m.sheet.name}>
            <input
              className={inputClass}
              value={draft.name}
              data-autofocus
              onChange={(e) => set({ name: e.target.value })}
            />
          </FieldLabel>
          <FieldLabel label={m.sheet.category}>
            <Select
              label={m.sheet.category}
              value={draft.category}
              onValue={(v) => set({ category: v })}
              options={(Object.keys(FEATURE_CATEGORY_LABELS) as FeatureCategory[]).map((k) => ({
                value: k,
                label: FEATURE_CATEGORY_LABELS[k],
              }))}
            />
          </FieldLabel>
          <FieldLabel label={m.sheet.origin}>
            <input
              className={inputClass}
              placeholder={m.sheet.originPlaceholder}
              value={draft.origin ?? ''}
              onChange={(e) => set({ origin: e.target.value || undefined })}
            />
          </FieldLabel>
        </div>

        <FieldLabel label={m.sheet.descriptionMd}>
          <textarea
            className={inputClass}
            rows={5}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </FieldLabel>

        <fieldset className="space-y-2 rounded-lg border border-line p-3">
          <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{m.sheet.uses}</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!draft.uses}
              onChange={(e) =>
                set({
                  uses: e.target.checked
                    ? { max: '1', used: 0, recharge: { shortRest: 0, longRest: 'all' }, pinned: true }
                    : undefined,
                })
              }
            />
            {m.sheet.limitedUses}
          </label>
          {draft.uses && (
            <div className="grid items-end gap-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <FieldLabel label={m.sheet.maxFormula}>
                <input
                  className={inputClass}
                  value={draft.uses.max}
                  placeholder="3 · pb · mod.cha · 5 * lvl.paladin"
                  onChange={(e) => set({ uses: { ...draft.uses!, max: e.target.value } })}
                />
                <FormulaPreview formula={draft.uses.max} vars={vars} />
              </FieldLabel>
              <FieldLabel label={m.sheet.shortRest}>
                <Select
                  label={m.sheet.rechargeShort}
                  value={toChoice(draft.uses.recharge.shortRest)}
                  options={RECHARGE_OPTIONS}
                  onValue={(v) =>
                    set({
                      uses: {
                        ...draft.uses!,
                        recharge: { ...draft.uses!.recharge, shortRest: fromChoice(v) },
                      },
                    })
                  }
                />
              </FieldLabel>
              <FieldLabel label={m.sheet.longRest}>
                <Select
                  label={m.sheet.rechargeLong}
                  value={toChoice(draft.uses.recharge.longRest)}
                  options={RECHARGE_OPTIONS}
                  onValue={(v) =>
                    set({
                      uses: {
                        ...draft.uses!,
                        recharge: { ...draft.uses!.recharge, longRest: fromChoice(v) },
                      },
                    })
                  }
                />
              </FieldLabel>
              <label className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={draft.uses.pinned}
                  onChange={(e) => set({ uses: { ...draft.uses!, pinned: e.target.checked } })}
                />
                {m.sheet.pinned}
              </label>
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-line p-3">
          <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
            {m.sheet.effectsOnSheet}
          </legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.toggleable}
              onChange={(e) => set({ toggleable: e.target.checked, active: !e.target.checked })}
            />
            {m.sheet.toggleable}
          </label>
          <EffectsEditor effects={draft.effects} vars={vars} onChange={(effects) => set({ effects })} />
        </fieldset>
      </div>
    </Dialog>
  );
}
