import { cn } from '@/lib/cn';
import { useState, type ReactNode } from 'react';
import { ABILITY_LABELS } from '@/data/i18n/it';
import { CLASSES } from '@/data/srd/classes';
import { ABILITIES, type Ability } from '@/domain/abilities';
import type { Spell, SpellLevel, SpellSchool } from '@/domain/spells';
import { normalizeKey } from '@/lib/normalizeKey';
import type { Units } from '@/lib/units';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { FieldLabel, inputClass, Select } from '@/ui/fields';
import { TagInput } from '@/ui/TagInput';
import { SCHOOL_LABELS } from './spellText';
import { blankSpell } from './spellFactory';
import { m } from '@/i18n';

const toDisplay = (ft: number | undefined, units: Units) =>
  ft === undefined ? '' : String(units === 'metric' ? (ft / 5) * 1.5 : ft).replace('.', ',');
const fromDisplay = (raw: string, units: Units): number | undefined => {
  const n = Number(raw.replace(',', '.'));
  if (!raw.trim() || !Number.isFinite(n) || n < 0) return undefined;
  return Math.round(units === 'metric' ? (n / 1.5) * 5 : n);
};

function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-4">{children}</div>;
}

interface SpellFormProps {
  spell: Spell | null;
  units: Units;
  onSave: (spell: Spell) => void;
  onClose: () => void;
}

/** Crea o modifica un incantesimo della libreria. */
export function SpellForm({ spell, units, onSave, onClose }: SpellFormProps) {
  const [d, setD] = useState<Spell>(() => spell ?? blankSpell());
  const set = (patch: Partial<Spell>) => setD((x) => ({ ...x, ...patch }));
  const unit = units === 'metric' ? 'm' : 'ft';
  const cantripDice = d.scaling?.cantrip ?? ['', '', '', ''];

  return (
    <Dialog
      open
      onClose={onClose}
      title={spell ? m.grimoire.form.edit(spell.name) : m.grimoire.form.new}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={!d.name.trim()}
            onClick={() =>
              onSave({ ...d, name: d.name.trim(), nameKey: normalizeKey(d.name), updatedAt: Date.now() })
            }
          >
            {m.common.save}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
          <FieldLabel label={m.grimoire.form.name}>
            <input
              aria-label={m.grimoire.form.name}
              data-autofocus
              className={inputClass}
              value={d.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </FieldLabel>
          <FieldLabel label={m.grimoire.form.nameEn}>
            <input
              aria-label={m.grimoire.form.nameEn}
              className={inputClass}
              value={d.nameEn ?? ''}
              onChange={(e) => set({ nameEn: e.target.value || undefined })}
            />
          </FieldLabel>
          <FieldLabel label={m.grimoire.form.source}>
            <input
              aria-label={m.grimoire.form.book}
              className={inputClass}
              placeholder="PHB’24"
              value={d.sourceBook ?? ''}
              onChange={(e) => set({ sourceBook: e.target.value || undefined })}
            />
          </FieldLabel>
        </div>

        <Row>
          <FieldLabel label={m.grimoire.form.level}>
            <Select
              label={m.grimoire.form.level}
              value={String(d.level)}
              onValue={(v) => set({ level: Number(v) as SpellLevel })}
              options={Array.from({ length: 10 }, (_, i) => ({
                value: String(i),
                label: i === 0 ? m.grimoire.form.cantrip : `${i}°`,
              }))}
            />
          </FieldLabel>
          <FieldLabel label={m.grimoire.form.school}>
            <Select
              label={m.grimoire.form.school}
              value={d.school}
              onValue={(school: SpellSchool) => set({ school })}
              options={(Object.keys(SCHOOL_LABELS) as SpellSchool[]).map((s) => ({
                value: s,
                label: SCHOOL_LABELS[s],
              }))}
            />
          </FieldLabel>
          <FieldLabel label={m.grimoire.form.castingTime}>
            <div className="flex gap-1">
              <input
                aria-label={m.grimoire.form.timeAmount}
                className={cn(inputClass, 'w-12')}
                value={d.castingTime.amount}
                onChange={(e) =>
                  set({ castingTime: { ...d.castingTime, amount: Math.max(1, Number(e.target.value) || 1) } })
                }
              />
              <Select
                label={m.grimoire.form.timeUnit}
                value={d.castingTime.unit}
                onValue={(unit) => set({ castingTime: { ...d.castingTime, unit } })}
                options={[
                  { value: 'action', label: m.grimoire.form.units.action },
                  { value: 'bonus', label: m.grimoire.form.units.bonus },
                  { value: 'reaction', label: m.grimoire.form.units.reaction },
                  { value: 'minute', label: m.grimoire.form.units.minute },
                  { value: 'hour', label: m.grimoire.form.units.hour },
                ]}
              />
            </div>
          </FieldLabel>
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input type="checkbox" checked={d.ritual} onChange={(e) => set({ ritual: e.target.checked })} />{' '}
            Rituale
          </label>
        </Row>
        {d.castingTime.unit === 'reaction' && (
          <FieldLabel label={m.grimoire.form.trigger}>
            <input
              aria-label={m.grimoire.form.trigger}
              className={inputClass}
              value={d.castingTime.condition ?? ''}
              onChange={(e) =>
                set({ castingTime: { ...d.castingTime, condition: e.target.value || undefined } })
              }
            />
          </FieldLabel>
        )}

        <Row>
          <FieldLabel label={m.grimoire.form.range}>
            <Select
              label={m.grimoire.form.rangeKind}
              value={d.range.kind}
              onValue={(kind) => set({ range: { ...d.range, kind } })}
              options={[
                { value: 'self', label: m.grimoire.rangeKinds.self },
                { value: 'touch', label: m.grimoire.rangeKinds.touch },
                { value: 'distance', label: m.grimoire.rangeKinds.distance },
                { value: 'sight', label: m.grimoire.rangeKinds.sight },
                { value: 'unlimited', label: m.grimoire.rangeKinds.unlimited },
                { value: 'special', label: m.grimoire.form.durationKinds.special },
              ]}
            />
          </FieldLabel>
          {d.range.kind === 'distance' && (
            <FieldLabel label={m.grimoire.form.distance(unit)}>
              <input
                aria-label={m.grimoire.form.distanceAria}
                className={inputClass}
                defaultValue={toDisplay(d.range.distance, units)}
                onChange={(e) => set({ range: { ...d.range, distance: fromDisplay(e.target.value, units) } })}
              />
            </FieldLabel>
          )}
          <FieldLabel label={m.grimoire.form.area}>
            <Select
              label={m.grimoire.form.areaShape}
              value={d.range.area?.shape ?? ''}
              onValue={(shape) =>
                set({
                  range: { ...d.range, area: shape ? { shape, size: d.range.area?.size ?? 20 } : undefined },
                })
              }
              options={[
                { value: '', label: m.grimoire.form.areaNone },
                { value: 'sphere', label: m.grimoire.form.areaShapes.sphere },
                { value: 'cone', label: m.grimoire.form.areaShapes.cone },
                { value: 'cube', label: m.grimoire.form.areaShapes.cube },
                { value: 'cylinder', label: m.grimoire.form.areaShapes.cylinder },
                { value: 'line', label: m.grimoire.form.areaShapes.line },
                { value: 'emanation', label: m.grimoire.form.areaShapes.emanation },
              ]}
            />
          </FieldLabel>
          {d.range.area && (
            <FieldLabel label={m.grimoire.form.size(unit)}>
              <input
                aria-label={m.grimoire.form.sizeAria}
                className={inputClass}
                defaultValue={toDisplay(d.range.area.size, units)}
                onChange={(e) => {
                  const size = fromDisplay(e.target.value, units);
                  if (size !== undefined) set({ range: { ...d.range, area: { ...d.range.area!, size } } });
                }}
              />
            </FieldLabel>
          )}
        </Row>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {(['v', 's', 'm'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={d.components[k]}
                onChange={(e) => set({ components: { ...d.components, [k]: e.target.checked } })}
              />
              {m.grimoire.form.components[k]}
            </label>
          ))}
          {d.components.m && (
            <input
              aria-label={m.grimoire.form.material}
              placeholder={m.grimoire.form.materialPlaceholder}
              className={cn(inputClass, 'min-w-60 flex-1')}
              value={d.components.material ?? ''}
              onChange={(e) =>
                set({ components: { ...d.components, material: e.target.value || undefined } })
              }
            />
          )}
        </div>

        <Row>
          <FieldLabel label={m.grimoire.form.duration}>
            <Select
              label={m.grimoire.form.durationKind}
              value={d.duration.kind}
              onValue={(kind) => set({ duration: { ...d.duration, kind } })}
              options={[
                { value: 'instant', label: m.grimoire.form.durationKinds.instant },
                { value: 'timed', label: m.grimoire.form.durationKinds.timed },
                { value: 'untilDispelled', label: m.grimoire.form.durationKinds.untilDispelled },
                { value: 'special', label: m.grimoire.form.durationKinds.special },
              ]}
            />
          </FieldLabel>
          {d.duration.kind === 'timed' && (
            <FieldLabel label={m.grimoire.form.howLong}>
              <div className="flex gap-1">
                <input
                  aria-label={m.grimoire.form.durationAmount}
                  className={cn(inputClass, 'w-14')}
                  value={d.duration.amount ?? 1}
                  onChange={(e) =>
                    set({ duration: { ...d.duration, amount: Math.max(1, Number(e.target.value) || 1) } })
                  }
                />
                <Select
                  label={m.grimoire.form.durationUnit}
                  value={d.duration.unit ?? 'minute'}
                  onValue={(u) => set({ duration: { ...d.duration, unit: u } })}
                  options={[
                    { value: 'round', label: m.grimoire.form.durationUnits.round },
                    { value: 'minute', label: m.grimoire.form.durationUnits.minute },
                    { value: 'hour', label: m.grimoire.form.durationUnits.hour },
                    { value: 'day', label: m.grimoire.form.durationUnits.day },
                  ]}
                />
              </div>
            </FieldLabel>
          )}
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input
              type="checkbox"
              checked={d.duration.concentration}
              onChange={(e) => set({ duration: { ...d.duration, concentration: e.target.checked } })}
            />
            {m.grimoire.form.concentration}
          </label>
        </Row>

        <FieldLabel label={m.grimoire.form.description}>
          <textarea
            aria-label={m.grimoire.form.descriptionAria}
            rows={6}
            className={inputClass}
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label={d.level === 0 ? m.grimoire.form.cantripUpgrade : m.grimoire.form.higherLevels}>
          <textarea
            aria-label={m.grimoire.form.higherLevels}
            rows={2}
            className={inputClass}
            value={d.higherLevels ?? ''}
            onChange={(e) => set({ higherLevels: e.target.value || undefined })}
          />
        </FieldLabel>

        <Row>
          {d.level === 0 ? (
            <FieldLabel label={m.grimoire.form.cantripDice} className="sm:col-span-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    aria-label={m.grimoire.form.cantripDiceTier(i + 1)}
                    placeholder={['1d10', '2d10', '3d10', '4d10'][i]}
                    className={cn(inputClass, 'w-16')}
                    value={cantripDice[i]}
                    onChange={(e) => {
                      const next = [...cantripDice] as [string, string, string, string];
                      next[i] = e.target.value;
                      set({ scaling: { ...d.scaling, cantrip: next } });
                    }}
                  />
                ))}
              </div>
            </FieldLabel>
          ) : (
            <FieldLabel label={m.grimoire.form.perSlot}>
              <input
                aria-label={m.grimoire.form.perSlotAria}
                placeholder="1d6"
                className={inputClass}
                value={d.scaling?.perSlot ?? ''}
                onChange={(e) => set({ scaling: { ...d.scaling, perSlot: e.target.value || undefined } })}
              />
            </FieldLabel>
          )}
          <FieldLabel label={m.grimoire.form.save}>
            <Select
              label={m.grimoire.form.save}
              value={d.save ?? ''}
              onValue={(v) => set({ save: (v || undefined) as Ability | undefined })}
              options={[
                { value: '', label: m.grimoire.form.none },
                ...ABILITIES.map((a) => ({ value: a, label: ABILITY_LABELS[a].long })),
              ]}
            />
          </FieldLabel>
          <FieldLabel label={m.grimoire.form.attack}>
            <Select
              label={m.grimoire.form.spellAttack}
              value={d.attack ?? ''}
              onValue={(v) => set({ attack: (v || undefined) as Spell['attack'] })}
              options={[
                { value: '', label: m.grimoire.form.none },
                { value: 'melee', label: m.grimoire.form.melee },
                { value: 'ranged', label: m.grimoire.form.ranged },
              ]}
            />
          </FieldLabel>
        </Row>

        <FieldLabel label={m.grimoire.form.classes}>
          <TagInput
            label={m.grimoire.form.classes}
            values={d.classes}
            suggestions={CLASSES.map((c) => c.name)}
            onChange={(classes) => set({ classes })}
          />
        </FieldLabel>
      </div>
    </Dialog>
  );
}
