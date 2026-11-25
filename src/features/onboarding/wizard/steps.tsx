import { Dices, Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import { ARMOR, ARMOR_CATEGORY_LABELS, armorAcText } from '@/data/srd/armor';
import { CLASSES, CLASSES_BY_KEY } from '@/data/srd/classes';
import { RARE_LANGUAGES, STANDARD_LANGUAGES } from '@/data/srd/languages';
import { WEAPONS } from '@/data/srd/weapons';
import { CLASS_EQUIPMENT } from '@/data/srd/classEquipment';
import { equipmentOptionLabel } from '@/features/inventory/classEquipment';
import { ABILITIES, SKILLS, type Ability } from '@/domain/abilities';
import { abilityMod } from '@/engine/abilities';
import { cn } from '@/lib/cn';
import { formatBonus } from '@/lib/dice';
import { Button } from '@/ui/Button';
import { FieldLabel, inputClass, Select } from '@/ui/fields';
import { TagInput } from '@/ui/TagInput';
import {
  AlignmentSelect,
  BackgroundFields,
  BonusFields,
  EquipmentChoice,
  SpeciesFields,
} from '@/features/origins/OriginFields';
import { useOriginLibrary } from '@/features/origins/useOriginLibrary';
import {
  backgroundBonus,
  checkAbilities,
  MASTERY_COUNT,
  originSkills,
  recommendedArray,
  recommendedScores,
  suggestedBonus,
  POINT_BUY_BUDGET,
  POINT_BUY_COST,
  pointBuySpent,
  remainingPool,
  roll4d6DropLowest,
  scoresForMethod,
  STANDARD_ARRAY,
  type AbilityMethod,
  type WizardDraft,
} from './logic';
import { m } from '@/i18n';

const W = m.onboarding.wizard;

export interface StepProps {
  d: WizardDraft;
  set: (patch: Partial<WizardDraft>) => void;
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

export function ConceptStep({ d, set }: StepProps) {
  const lib = useOriginLibrary();
  const bg = lib.backgrounds.find((b) => b.id === d.backgroundId);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label={W.name}>
          <input
            aria-label={W.name}
            className={inputClass}
            placeholder={W.namePlaceholder}
            value={d.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label={W.alignment}>
          <AlignmentSelect value={d.alignment} onValue={(alignment) => set({ alignment })} />
        </FieldLabel>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{W.species}</legend>
        <SpeciesFields
          lib={lib}
          value={{ speciesId: d.speciesId, choices: d.speciesChoices, customName: d.species }}
          onChange={(p) => {
            const patch: Partial<WizardDraft> = {};
            if (p.speciesId !== undefined) {
              patch.speciesId = p.speciesId;
              const def = lib.species.find((s) => s.id === p.speciesId);
              if (def) {
                patch.species = def.name;
                patch.size = def.sizes.includes('M') ? 'M' : def.sizes[0]!;
              }
            }
            if (p.choices) {
              patch.speciesChoices = p.choices;
              if (p.choices.size) patch.size = p.choices.size;
            }
            if (p.customName !== undefined) patch.species = p.customName;
            set(patch);
          }}
        />
        {!d.speciesId && (
          <FieldLabel label={W.size} className="max-w-xs">
            <Select
              label={W.size}
              value={d.size}
              onValue={(size) => set({ size })}
              options={[
                { value: 'S', label: m.terms.sizes.S },
                { value: 'M', label: m.terms.sizes.M },
                { value: 'L', label: m.terms.sizes.L },
              ]}
            />
          </FieldLabel>
        )}
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
          {W.background}
        </legend>
        <BackgroundFields
          lib={lib}
          value={{ backgroundId: d.backgroundId, customName: d.background, feat: d.backgroundFeat }}
          onChange={(p) => {
            const patch: Partial<WizardDraft> = {};
            if (p.backgroundId !== undefined) {
              patch.backgroundId = p.backgroundId;
              patch.bonusAbilities = [];
              const def = lib.backgrounds.find((b) => b.id === p.backgroundId);
              if (def) patch.background = def.name;
            }
            if (p.feat) patch.backgroundFeat = p.feat;
            if (p.customName !== undefined) patch.background = p.customName;
            set(patch);
          }}
        >
          {bg && (
            <EquipmentChoice
              def={bg}
              value={d.backgroundEquipment}
              onChange={(backgroundEquipment) => set({ backgroundEquipment })}
            />
          )}
        </BackgroundFields>
        <Hint>{W.bonusLater}</Hint>
      </fieldset>
    </div>
  );
}

export function ClassStep({ d, set }: StepProps) {
  const srd = CLASSES_BY_KEY.get(d.classKey);
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {CLASSES.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={d.classKey === c.key}
            onClick={() =>
              set({
                classKey: c.key,
                spellAbility: c.spellcastingAbility ?? '',
                classEquipment: CLASS_EQUIPMENT[c.key] ? 'A' : 'none',
                masteries: [],
              })
            }
            className={cn(
              'rounded-lg border p-3 text-left text-sm transition-colors',
              d.classKey === c.key ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/50',
            )}
          >
            <span className="block font-medium">{c.name}</span>
            <span className="block text-xs text-muted">
              d{c.hitDie} · {W.savesShort} {c.saves.map((s) => ABILITY_LABELS[s].short).join('/')}
              {c.caster !== 'none' && W.magicTag}
            </span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={d.classKey === ''}
          onClick={() => set({ classKey: '', masteries: [], classEquipment: 'none' })}
          className={cn(
            'rounded-lg border border-dashed p-3 text-left text-sm',
            d.classKey === '' ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/50',
          )}
        >
          <span className="block font-medium">{W.custom}</span>
          <span className="block text-xs text-muted">{W.customHint}</span>
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {!srd && (
          <FieldLabel label={W.className}>
            <input
              aria-label={W.className}
              className={inputClass}
              value={d.customClassName}
              onChange={(e) => set({ customClassName: e.target.value })}
            />
          </FieldLabel>
        )}
        <FieldLabel label={W.level}>
          <input
            aria-label={W.level}
            inputMode="numeric"
            className={inputClass}
            value={d.level}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= 20) set({ level: n });
            }}
          />
        </FieldLabel>
        <FieldLabel label={W.subclass}>
          <input
            aria-label={W.subclass}
            className={inputClass}
            value={d.subclass}
            onChange={(e) => set({ subclass: e.target.value })}
          />
        </FieldLabel>
      </div>
      {srd && (
        <Hint>
          {W.training(srd.armor.length ? srd.armor.join(', ') : W.none, srd.weapons.join(', '))}
        </Hint>
      )}
    </div>
  );
}

const METHODS: Array<{ key: AbilityMethod; label: string }> = [
  { key: 'standard', label: W.methods.standard },
  { key: 'pointbuy', label: W.methods.pointbuy },
  { key: 'roll', label: W.methods.roll },
  { key: 'manual', label: W.methods.manual },
];

export function AbilitiesStep({ d, set }: StepProps) {
  const check = checkAbilities(d);
  const bonus = backgroundBonus(d);
  const bg = useOriginLibrary().backgrounds.find((b) => b.id === d.backgroundId);
  const srd = CLASSES_BY_KEY.get(d.classKey);
  const rec = recommendedArray(d.classKey);
  const suggested = recommendedScores(d);
  const bonusTip = srd ? suggestedBonus(d.classKey, bg?.abilities) : [];
  const pool = d.method === 'standard' ? [...STANDARD_ARRAY] : d.rolled;
  const left = remainingPool(pool, d.scores);

  const scoreInput = (a: Ability) => {
    if (d.method === 'standard' || d.method === 'roll') {
      const options = [...new Set([d.scores[a], ...left].filter((v) => v > 0))].sort((x, y) => y - x);
      return (
        <select
          aria-label={W.scoreOf(ABILITY_LABELS[a].long)}
          className={cn(inputClass, 'w-20')}
          value={d.scores[a] || ''}
          onChange={(e) => set({ scores: { ...d.scores, [a]: Number(e.target.value) || 0 } })}
        >
          <option value="">—</option>
          {options.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }
    const [min, max] = d.method === 'pointbuy' ? [8, 15] : [3, 18];
    return (
      <span className="inline-flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label={m.common.decrease(ABILITY_LABELS[a].long)}
          disabled={d.scores[a] <= min}
          onClick={() => set({ scores: { ...d.scores, [a]: d.scores[a] - 1 } })}
        >
          −
        </Button>
        <span className="w-6 text-center tabular-nums">{d.scores[a]}</span>
        <Button
          size="sm"
          variant="ghost"
          aria-label={m.common.increase(ABILITY_LABELS[a].long)}
          disabled={d.scores[a] >= max}
          onClick={() => set({ scores: { ...d.scores, [a]: d.scores[a] + 1 } })}
        >
          +
        </Button>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label={W.method} className="flex flex-wrap gap-1">
        {METHODS.map((mt) => (
          <button
            key={mt.key}
            type="button"
            role="radio"
            aria-checked={d.method === mt.key}
            onClick={() =>
              set({ method: mt.key, scores: scoresForMethod(mt.key), rolled: mt.key === 'roll' ? d.rolled : [] })
            }
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              d.method === mt.key
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line text-muted hover:text-ink',
            )}
          >
            {mt.label}
          </button>
        ))}
      </div>

      {d.method === 'standard' && <Hint>{W.standardHint}</Hint>}
      {d.method === 'pointbuy' && (
        <Hint>
          {W.pointBuyHint(
            Number.isFinite(pointBuySpent(d.scores)) ? String(pointBuySpent(d.scores)) : '—',
            POINT_BUY_BUDGET,
            Object.entries(POINT_BUY_COST)
              .map(([s, c]) => `${s}=${c}`)
              .join(' '),
          )}
        </Hint>
      )}
      {d.method === 'roll' && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            icon={Dices}
            onClick={() => set({ rolled: roll4d6DropLowest(), scores: scoresForMethod('roll') })}
          >
            {d.rolled.length ? W.reroll : W.roll}
          </Button>
          {d.rolled.length > 0 && <span className="text-sm tabular-nums">{W.rolledValues(d.rolled.join(', '))}</span>}
        </div>
      )}

      {srd && rec && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent-soft/40 p-3">
          <Lightbulb className="size-4 shrink-0 text-accent" aria-hidden />
          <p className="min-w-60 flex-1 text-sm">
            <span className="font-medium">{W.recommendedFor(srd.name)}</span>{' '}
            {[...ABILITIES]
              .sort((x, y) => rec[y] - rec[x])
              .map((a) => `${ABILITY_LABELS[a].short} ${rec[a]}`)
              .join(' · ')}
            <span className="block text-xs text-muted">
              {W.primary(srd.primary.length > 1)}:{' '}
              {srd.primary.map((a) => ABILITY_LABELS[a].long).join(W.or)}.
              {d.method === 'roll' && W.rollHint}
            </span>
          </p>
          <Button
            size="sm"
            variant="primary"
            disabled={!suggested}
            title={!suggested ? W.check.rollFirst : undefined}
            onClick={() => suggested && set({ scores: suggested })}
          >
            {d.method === 'roll' ? W.assignRolls : W.useRecommended}
          </Button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-muted">
            <th className="py-1 font-medium">{W.colAbility}</th>
            {rec && <th className="py-1 font-medium">{W.colRecommended}</th>}
            <th className="py-1 font-medium">{W.colBase}</th>
            <th className="py-1 font-medium">{W.colBackground}</th>
            <th className="py-1 font-medium">{W.colTotal}</th>
          </tr>
        </thead>
        <tbody>
          {ABILITIES.map((a) => {
            const total = (d.scores[a] || 0) + bonus[a];
            return (
              <tr key={a} className="border-t border-line">
                <td className="py-1.5">
                  {ABILITY_LABELS[a].long}
                  {srd?.primary.includes(a) && (
                    <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] font-semibold text-accent">
                      {W.primaryTag}
                    </span>
                  )}
                </td>
                {rec && <td className="py-1.5 text-muted tabular-nums">{suggested?.[a] ?? rec[a]}</td>}
                <td className="py-1.5">{scoreInput(a)}</td>
                <td className="py-1.5 text-muted">{bonus[a] ? `+${bonus[a]}` : '—'}</td>
                <td className="py-1.5 font-medium tabular-nums">
                  {d.scores[a] ? `${total} (${formatBonus(abilityMod(total))})` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!check.ok && <p className="text-xs text-danger">{check.message}</p>}

      <fieldset className="space-y-2 rounded-lg border border-line p-3">
        <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
          {W.backgroundIncreases}
        </legend>
        <BonusFields
          allowed={bg?.abilities}
          mode={d.bonusMode}
          picks={d.bonusAbilities}
          onChange={(bonusMode, bonusAbilities) => set({ bonusMode, bonusAbilities })}
        />
        {bonusTip.length === 2 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">
              {W.suggestedBonus(srd!.name, ABILITY_LABELS[bonusTip[0]!].short, ABILITY_LABELS[bonusTip[1]!].short)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => set({ bonusMode: 'twoOne', bonusAbilities: bonusTip })}
            >
              {m.common.apply}
            </Button>
          </div>
        )}
        <Hint>
          {bg
            ? W.chooseAmong(bg.name, bg.abilities.map((a) => ABILITY_LABELS[a].long).join(', '))
            : W.rule2024}{' '}
          {W.max20}
        </Hint>
      </fieldset>
    </div>
  );
}

export function ProficienciesStep({ d, set }: StepProps) {
  const srd = CLASSES_BY_KEY.get(d.classKey);
  const lib = useOriginLibrary();
  const granted = originSkills(d, lib);
  const hasBackground = Boolean(d.backgroundId);
  const suggested = (srd?.skillChoices ?? 2) + (hasBackground ? 0 : 2);
  const chosen = d.skills.filter((s) => !granted.includes(s));
  const masteryCount = MASTERY_COUNT[d.classKey] ?? 0;
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-medium">
          {W.skills}{' '}
          <span className="text-xs font-normal text-muted">
            {W.skillsCount(chosen.length, suggested, hasBackground)}
          </span>
        </h3>
        <div className="grid gap-1 sm:grid-cols-3">
          {SKILLS.map((s) => {
            const fromOrigin = granted.includes(s);
            return (
              <label key={s} className={cn('flex items-center gap-2 text-sm', fromOrigin && 'text-muted')}>
                <input
                  type="checkbox"
                  checked={fromOrigin || d.skills.includes(s)}
                  disabled={fromOrigin}
                  onChange={() => set({ skills: toggle(d.skills, s) })}
                />
                {SKILL_LABELS[s]}
                {fromOrigin && <span className="text-[10px]">{W.fromOrigin}</span>}
              </label>
            );
          })}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label={W.languages}>
          <TagInput
            label={W.languages}
            values={d.languages}
            suggestions={[...STANDARD_LANGUAGES, ...RARE_LANGUAGES]}
            onChange={(languages) => set({ languages })}
          />
        </FieldLabel>
        <FieldLabel label={W.tools}>
          <TagInput label={W.tools} values={d.tools} onChange={(tools) => set({ tools })} />
        </FieldLabel>
      </div>
      {masteryCount > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            {W.weaponMastery}{' '}
            <span className="text-xs font-normal text-muted">
              ({d.masteries.length}/{masteryCount})
            </span>
          </h3>
          <div className="grid gap-1 sm:grid-cols-4">
            {WEAPONS.map((w) => (
              <label key={w.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={d.masteries.includes(w.id)}
                  disabled={!d.masteries.includes(w.id) && d.masteries.length >= masteryCount}
                  onChange={() => set({ masteries: toggle(d.masteries, w.id) })}
                />
                {w.name}
              </label>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function EquipmentStep({ d, set }: StepProps) {
  const srd = CLASSES_BY_KEY.get(d.classKey);
  const training = srd?.armor ?? [];
  const options = CLASS_EQUIPMENT[d.classKey] ?? [];
  const bg = useOriginLibrary().backgrounds.find((b) => b.id === d.backgroundId);
  const manual = d.classEquipment === 'none' || !options.length;
  const goldField = (
    <FieldLabel label={manual ? W.gold : W.extraGold} className="max-w-48">
      <input
        aria-label={W.goldAria}
        inputMode="numeric"
        className={inputClass}
        value={d.gold}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isInteger(n) && n >= 0) set({ gold: n });
        }}
      />
    </FieldLabel>
  );

  return (
    <div className="space-y-5">
      {srd && options.length > 0 && (
        <fieldset className="space-y-2 rounded-lg border border-line p-3">
          <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
            {W.classEquipment(srd.name)}
          </legend>
          {options.map((o) => (
            <label key={o.key} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                className="mt-1"
                checked={d.classEquipment === o.key}
                onChange={() => set({ classEquipment: o.key })}
              />
              <span>
                <span className="font-medium">{o.key}:</span> {equipmentOptionLabel(o)}
              </span>
            </label>
          ))}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              className="mt-1"
              checked={d.classEquipment === 'none'}
              onChange={() => set({ classEquipment: 'none' })}
            />
            {W.chooseOwn}
          </label>
          <Hint>{W.equippedHint}</Hint>
        </fieldset>
      )}

      {bg && d.backgroundEquipment !== 'none' && (
        <Hint>
          {W.fromBackground(
            bg.name,
            d.backgroundEquipment,
            d.backgroundEquipment === 'A'
              ? [
                  ...bg.equipment.map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name)),
                  ...(bg.equipmentGoldInA ? [`${bg.equipmentGoldInA} ${W.gp}`] : []),
                ].join(', ')
              : `${bg.equipmentGold} ${W.gp}`,
          )}
        </Hint>
      )}

      {manual ? (
        <>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <FieldLabel label={W.armor}>
              <Select
                label={W.armor}
                value={d.armorId}
                onValue={(armorId) => set({ armorId })}
                options={[
                  { value: '', label: W.noArmor },
                  ...ARMOR.filter((a) => a.category !== 'shield').map((a) => ({
                    value: a.id,
                    label: `${a.name} · ${ARMOR_CATEGORY_LABELS[a.category]} · ${W.ac} ${armorAcText(a)}${training.length && !training.includes(a.category as never) ? W.untrained : ''}`,
                  })),
                ]}
              />
            </FieldLabel>
            <label className="flex items-center gap-2 pt-5 text-sm">
              <input type="checkbox" checked={d.shield} onChange={(e) => set({ shield: e.target.checked })} />{' '}
              {W.shield}
            </label>
            {goldField}
          </div>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{W.weapons}</h3>
            <div className="grid gap-1 sm:grid-cols-4">
              {WEAPONS.map((w) => (
                <label key={w.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={d.weaponIds.includes(w.id)}
                    onChange={() => set({ weaponIds: toggle(d.weaponIds, w.id) })}
                  />
                  {w.name}
                </label>
              ))}
            </div>
          </section>
          <Hint>{W.restOfGear}</Hint>
        </>
      ) : (
        goldField
      )}
    </div>
  );
}
export function MagicStep({ d, set }: StepProps) {
  const srd = CLASSES_BY_KEY.get(d.classKey);
  const casts = srd ? srd.caster !== 'none' : true;
  if (!casts) {
    return (
      <p className="text-sm text-muted">{W.noMagic(srd?.name ?? '')}</p>
    );
  }
  return (
    <div className="space-y-3">
      <FieldLabel label={W.castingAbility} className="max-w-xs">
        <Select
          label={W.castingAbility}
          value={d.spellAbility}
          onValue={(v) => set({ spellAbility: v })}
          options={[
            { value: '', label: srd ? '—' : W.notCaster },
            ...(['int', 'wis', 'cha'] as Ability[]).map((a) => ({ value: a, label: ABILITY_LABELS[a].long })),
          ]}
        />
      </FieldLabel>
      <Hint>
        {W.magicHint}
      </Hint>
    </div>
  );
}
