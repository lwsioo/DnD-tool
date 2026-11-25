import type { ReactNode } from 'react';
import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import { ABILITIES, SKILLS, type Ability, type SkillKey } from '@/domain/abilities';
import { ALIGNMENTS, type BackgroundDef, type FeatDef, type SpeciesDef } from '@/domain/origins';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatDistance, type Units } from '@/lib/units';
import { FieldLabel, inputClass, Select } from '@/ui/fields';
import type { FeatChoices, OriginLibrary, SpeciesChoices } from './applyOrigin';
import { m } from '@/i18n';

const O = m.misc.origins;

const SIZE_LABELS = m.terms.sizes;
const CASTING: Ability[] = ['int', 'wis', 'cha'];

const label = (d: { name: string; origin: string; sourceBook?: string }) =>
  d.origin !== 'srd' && d.sourceBook ? `${d.name} (${d.sourceBook})` : d.name;

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

/** N selettori di abilità distinte, opzionalmente limitati a una lista. */
function SkillPicks({
  count,
  from,
  value,
  onChange,
  name,
}: {
  count: number;
  from?: SkillKey[];
  value: SkillKey[];
  onChange: (v: SkillKey[]) => void;
  name: string;
}) {
  const pool = from ?? SKILLS;
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Select
          key={i}
          label={count > 1 ? `${name} ${i + 1}` : name}
          className="w-auto"
          value={value[i] ?? ''}
          onValue={(v) => {
            const next = [...value];
            next[i] = v as SkillKey;
            onChange(next.filter(Boolean));
          }}
          options={[
            { value: '', label: O.pickSkill },
            ...pool
              .filter((s) => s === value[i] || !value.includes(s))
              .map((s) => ({ value: s, label: SKILL_LABELS[s] })),
          ]}
        />
      ))}
    </div>
  );
}

function AbilityPick({
  label: l,
  value,
  onValue,
}: {
  label: string;
  value?: Ability;
  onValue: (a: Ability) => void;
}) {
  return (
    <FieldLabel label={l}>
      <Select
        label={l}
        value={value ?? 'wis'}
        onValue={(v) => onValue(v)}
        options={CASTING.map((a) => ({ value: a, label: ABILITY_LABELS[a].long }))}
      />
    </FieldLabel>
  );
}

/** Scelte richieste da un talento: lista di incantesimi, caratteristica, abilità. */
export function FeatFields({
  feat,
  value,
  onChange,
  fixedList,
}: {
  feat: FeatDef;
  value: FeatChoices;
  onChange: (v: FeatChoices) => void;
  /** Lista già stabilita dal background (es. Accolito → Chierico). */
  fixedList?: string;
}) {
  const lists = feat.spellLists ?? [];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lists.length > 0 && !fixedList && (
        <FieldLabel label={O.spellList}>
          <Select
            label={O.featSpellList(feat.name)}
            value={value.spellList ?? lists[0]!}
            onValue={(spellList) => onChange({ ...value, spellList })}
            options={lists.map((l) => ({ value: l, label: l }))}
          />
        </FieldLabel>
      )}
      {lists.length > 0 && (
        <AbilityPick
          label={O.featAbility(feat.name)}
          value={value.spellAbility}
          onValue={(spellAbility) => onChange({ ...value, spellAbility })}
        />
      )}
      {(feat.skillChoices ?? 0) > 0 && (
        <div className="space-y-1 sm:col-span-2">
          <p className="text-xs text-muted">{O.featSkillsTitle(feat.name)}</p>
          <SkillPicks
            count={feat.skillChoices!}
            name={O.featSkill(feat.name)}
            value={value.skills ?? []}
            onChange={(skills) => onChange({ ...value, skills })}
          />
        </div>
      )}
      {lists.length > 0 && (
        <Hint>{O.grantedSpells}</Hint>
      )}
    </div>
  );
}

export interface SpeciesValue {
  speciesId: string;
  choices: SpeciesChoices;
  /** Nome libero se la specie non è in libreria. */
  customName: string;
}

export function SpeciesFields({
  lib,
  value,
  onChange,
}: {
  lib: OriginLibrary;
  value: SpeciesValue;
  onChange: (patch: Partial<SpeciesValue>) => void;
}) {
  const { units } = useAppSettings();
  const def = lib.species.find((s) => s.id === value.speciesId);
  const ch = value.choices;
  const setCh = (patch: Partial<SpeciesChoices>) => onChange({ choices: { ...ch, ...patch } });
  const option = def?.choice?.options.find((o) => o.key === ch.optionKey);
  const feat = lib.feats.find((f) => f.id === ch.featId);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel label={O.species}>
          <Select
            label={O.species}
            value={value.speciesId}
            onValue={(speciesId) => onChange({ speciesId, choices: {} })}
            options={[
              { value: '', label: O.customSpecies },
              ...lib.species.map((s) => ({ value: s.id, label: label(s) })),
            ]}
          />
        </FieldLabel>
        {!def && (
          <FieldLabel label={O.speciesName}>
            <input
              aria-label={O.speciesName}
              className={inputClass}
              placeholder={O.speciesPlaceholder}
              value={value.customName}
              onChange={(e) => onChange({ customName: e.target.value })}
            />
          </FieldLabel>
        )}
        {def && def.sizes.length > 1 && (
          <FieldLabel label={O.size}>
            <Select
              label={O.size}
              value={
                ch.size && def.sizes.includes(ch.size)
                  ? ch.size
                  : def.sizes.includes('M')
                    ? 'M'
                    : def.sizes[0]!
              }
              onValue={(size) => setCh({ size })}
              options={def.sizes.map((s) => ({ value: s, label: SIZE_LABELS[s] }))}
            />
          </FieldLabel>
        )}
        {def?.choice && (
          <FieldLabel label={def.choice.label}>
            <Select
              label={def.choice.label}
              value={ch.optionKey ?? ''}
              onValue={(optionKey) => setCh({ optionKey: optionKey || undefined })}
              options={[
                { value: '', label: O.choose },
                ...def.choice.options.map((o) => ({ value: o.key, label: o.name })),
              ]}
            />
          </FieldLabel>
        )}
        {option?.grantsSpells && (
          <AbilityPick
            label={O.speciesAbility}
            value={ch.spellAbility}
            onValue={(spellAbility) => setCh({ spellAbility })}
          />
        )}
      </div>

      {def && <SpeciesSummary def={def} units={units} />}

      {def?.skillChoice && (
        <div className="space-y-1">
          <p className="text-xs text-muted">{O.speciesSkillTitle}</p>
          <SkillPicks
            count={def.skillChoice.count}
            from={def.skillChoice.from}
            name={O.speciesSkill}
            value={ch.skills ?? []}
            onChange={(skills) => setCh({ skills })}
          />
        </div>
      )}

      {def?.originFeat && (
        <div className="space-y-2 rounded-lg border border-line p-3">
          <FieldLabel label={O.versatile}>
            <Select
              label={O.speciesFeat}
              value={ch.featId ?? ''}
              onValue={(featId) => setCh({ featId: featId || undefined, feat: {} })}
              options={[
                { value: '', label: O.choose },
                ...lib.feats
                  .filter((f) => f.category === 'origin')
                  .map((f) => ({ value: f.id, label: label(f) })),
              ]}
            />
          </FieldLabel>
          {feat && <FeatFields feat={feat} value={ch.feat ?? {}} onChange={(f) => setCh({ feat: f })} />}
        </div>
      )}
    </div>
  );
}

function SpeciesSummary({ def, units }: { def: SpeciesDef; units: Units }) {
  const facts = [
    def.sizes.map((s) => SIZE_LABELS[s]).join(O.or),
    O.speed(formatDistance(def.speed, units)),
    def.darkvision ? O.darkvision(formatDistance(def.darkvision, units)) : null,
  ].filter(Boolean);
  return (
    <Hint>
      {O.traits(facts.join(' · '), def.traits.map((t) => t.name).join(', '))}
      {def.choice ? O.plusChoice(def.choice.label.toLowerCase()) : ''}.
    </Hint>
  );
}

export interface BackgroundValue {
  backgroundId: string;
  customName: string;
  feat: FeatChoices;
}

export function BackgroundFields({
  lib,
  value,
  onChange,
  children,
}: {
  lib: OriginLibrary;
  value: BackgroundValue;
  onChange: (patch: Partial<BackgroundValue>) => void;
  /** Campi aggiuntivi (bonus, equipaggiamento) mostrati sotto. */
  children?: ReactNode;
}) {
  const def = lib.backgrounds.find((b) => b.id === value.backgroundId);
  const feat = def?.featId ? lib.feats.find((f) => f.id === def.featId) : undefined;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel label={O.background0}>
          <Select
            label={O.background0}
            value={value.backgroundId}
            onValue={(backgroundId) => onChange({ backgroundId, feat: {} })}
            options={[
              { value: '', label: O.customBackground },
              ...lib.backgrounds.map((b) => ({ value: b.id, label: label(b) })),
            ]}
          />
        </FieldLabel>
        {!def && (
          <FieldLabel label={O.backgroundName}>
            <input
              aria-label={O.backgroundName}
              className={inputClass}
              placeholder={O.backgroundPlaceholder}
              value={value.customName}
              onChange={(e) => onChange({ customName: e.target.value })}
            />
          </FieldLabel>
        )}
      </div>
      {def && <BackgroundSummary def={def} />}
      {feat && (
        <FeatFields
          feat={feat}
          value={value.feat}
          onChange={(f) => onChange({ feat: f })}
          fixedList={feat.spellLists?.find((l) => def?.featName?.includes(l))}
        />
      )}
      {def && children}
    </div>
  );
}

export function BackgroundSummary({ def }: { def: BackgroundDef }) {
  return (
    <Hint>
      {O.bgSummary(
        def.abilities.map((a) => ABILITY_LABELS[a].short).join(', '),
        def.featName ?? def.featId ?? '—',
        def.skills.map((s) => SKILL_LABELS[s]).join(', '),
      )}
      {def.tools.length > 0 && O.bgTools(def.tools.join(', '))}
    </Hint>
  );
}

/** Scelta tra equipaggiamento A (oggetti + monete), B (solo monete) o nessuno. */
export function EquipmentChoice({
  def,
  value,
  onChange,
}: {
  def: BackgroundDef;
  value: 'A' | 'B' | 'none';
  onChange: (v: 'A' | 'B' | 'none') => void;
}) {
  const items = def.equipment.map((e) => (e.quantity > 1 ? `${e.name} ×${e.quantity}` : e.name)).join(', ');
  const opts: Array<['A' | 'B' | 'none', string]> = [
    ['A', `A: ${items}${def.equipmentGoldInA ? `, ${def.equipmentGoldInA} ${O.gp}` : ''}`],
    ['B', `B: ${def.equipmentGold} ${O.gp}`],
    ['none', O.noEquipment],
  ];
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 text-xs text-muted">{O.bgEquipment}</legend>
      {opts.map(([k, text]) => (
        <label key={k} className="flex items-start gap-2 text-sm">
          <input type="radio" className="mt-1" checked={value === k} onChange={() => onChange(k)} />
          {text}
        </label>
      ))}
    </fieldset>
  );
}

/** Aumenti di caratteristica del background: +2/+1 o +1/+1/+1 tra quelle consentite. */
export function BonusFields({
  allowed = [...ABILITIES],
  mode,
  picks,
  onChange,
}: {
  allowed?: Ability[];
  mode: 'twoOne' | 'threeOnes';
  picks: Ability[];
  onChange: (mode: 'twoOne' | 'threeOnes', picks: Ability[]) => void;
}) {
  const slots = mode === 'twoOne' ? ['+2', '+1'] : ['+1', '+1', '+1'];
  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-sm">
        {(['twoOne', 'threeOnes'] as const).map((md) => (
          <label key={md} className="flex items-center gap-1.5">
            <input type="radio" checked={mode === md} onChange={() => onChange(md, [])} />
            {md === 'twoOne' ? O.twoOne : O.threeOnes}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((l, i) => (
          <Select
            key={i}
            label={O.increase(i + 1, l)}
            value={picks[i] ?? ''}
            className="w-auto"
            onValue={(v) => {
              const next = [...picks];
              next[i] = v as Ability;
              onChange(mode, next.filter(Boolean) as Ability[]);
            }}
            options={[
              { value: '', label: `${l}: —` },
              ...allowed
                .filter((a) => a === picks[i] || !picks.includes(a))
                .map((a) => ({ value: a, label: `${l} ${ABILITY_LABELS[a].short}` })),
            ]}
          />
        ))}
      </div>
    </div>
  );
}

/** Selettore dell'allineamento dalla lista standard (più un eventuale valore personalizzato già salvato). */
export function AlignmentSelect({ value, onValue }: { value: string; onValue: (v: string) => void }) {
  const known = ALIGNMENTS.includes(value);
  return (
    <Select
      label={O.alignment}
      value={value}
      onValue={onValue}
      options={[
        { value: '', label: '—' },
        ...ALIGNMENTS.map((a) => ({ value: a, label: a })),
        ...(value && !known ? [{ value, label: value }] : []),
      ]}
    />
  );
}
