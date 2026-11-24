import { Dices } from 'lucide-react';
import type { ReactNode } from 'react';
import { ABILITY_LABELS, SKILL_LABELS } from '@/data/i18n/it';
import { ARMOR, ARMOR_CATEGORY_LABELS, armorAcText } from '@/data/srd/armor';
import { CLASSES, CLASSES_BY_KEY } from '@/data/srd/classes';
import { RARE_LANGUAGES, STANDARD_LANGUAGES } from '@/data/srd/languages';
import { WEAPONS } from '@/data/srd/weapons';
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
        <FieldLabel label="Nome">
          <input
            aria-label="Nome"
            className={inputClass}
            placeholder="es. Lyra Solmonte"
            value={d.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label="Allineamento">
          <AlignmentSelect value={d.alignment} onValue={(alignment) => set({ alignment })} />
        </FieldLabel>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Specie</legend>
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
          <FieldLabel label="Taglia" className="max-w-xs">
            <Select
              label="Taglia"
              value={d.size}
              onValue={(size) => set({ size })}
              options={[
                { value: 'S', label: 'Piccola' },
                { value: 'M', label: 'Media' },
                { value: 'L', label: 'Grande' },
              ]}
            />
          </FieldLabel>
        )}
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Background
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
        <Hint>Gli aumenti di caratteristica del background si scelgono al passo Caratteristiche.</Hint>
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
              d{c.hitDie} · TS {c.saves.map((s) => ABILITY_LABELS[s].short).join('/')}
              {c.caster !== 'none' && ' · magia'}
            </span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={d.classKey === ''}
          onClick={() => set({ classKey: '', masteries: [] })}
          className={cn(
            'rounded-lg border border-dashed p-3 text-left text-sm',
            d.classKey === '' ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/50',
          )}
        >
          <span className="block font-medium">Personalizzata</span>
          <span className="block text-xs text-muted">Classe non SRD</span>
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {!srd && (
          <FieldLabel label="Nome della classe">
            <input
              aria-label="Nome della classe"
              className={inputClass}
              value={d.customClassName}
              onChange={(e) => set({ customClassName: e.target.value })}
            />
          </FieldLabel>
        )}
        <FieldLabel label="Livello">
          <input
            aria-label="Livello"
            inputMode="numeric"
            className={inputClass}
            value={d.level}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= 20) set({ level: n });
            }}
          />
        </FieldLabel>
        <FieldLabel label="Sottoclasse">
          <input
            aria-label="Sottoclasse"
            className={inputClass}
            value={d.subclass}
            onChange={(e) => set({ subclass: e.target.value })}
          />
        </FieldLabel>
      </div>
      {srd && (
        <Hint>
          Addestramento: armature {srd.armor.length ? srd.armor.join(', ') : 'nessuna'}; armi{' '}
          {srd.weapons.join(', ')}. I privilegi di classe si aggiungono poi dalla scheda.
        </Hint>
      )}
    </div>
  );
}

const METHODS: Array<{ key: AbilityMethod; label: string }> = [
  { key: 'standard', label: 'Serie standard' },
  { key: 'pointbuy', label: 'Point buy (27)' },
  { key: 'roll', label: 'Tira 4d6' },
  { key: 'manual', label: 'Manuale' },
];

export function AbilitiesStep({ d, set }: StepProps) {
  const check = checkAbilities(d);
  const bonus = backgroundBonus(d);
  const bg = useOriginLibrary().backgrounds.find((b) => b.id === d.backgroundId);
  const pool = d.method === 'standard' ? [...STANDARD_ARRAY] : d.rolled;
  const left = remainingPool(pool, d.scores);

  const scoreInput = (a: Ability) => {
    if (d.method === 'standard' || d.method === 'roll') {
      const options = [...new Set([d.scores[a], ...left].filter((v) => v > 0))].sort((x, y) => y - x);
      return (
        <select
          aria-label={`${ABILITY_LABELS[a].long}: valore`}
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
          aria-label={`Diminuisci ${ABILITY_LABELS[a].long}`}
          disabled={d.scores[a] <= min}
          onClick={() => set({ scores: { ...d.scores, [a]: d.scores[a] - 1 } })}
        >
          −
        </Button>
        <span className="w-6 text-center tabular-nums">{d.scores[a]}</span>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Aumenta ${ABILITY_LABELS[a].long}`}
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
      <div role="radiogroup" aria-label="Metodo" className="flex flex-wrap gap-1">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={d.method === m.key}
            onClick={() =>
              set({ method: m.key, scores: scoresForMethod(m.key), rolled: m.key === 'roll' ? d.rolled : [] })
            }
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              d.method === m.key
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line text-muted hover:text-ink',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {d.method === 'standard' && <Hint>Assegna 15, 14, 13, 12, 10 e 8, una volta ciascuno.</Hint>}
      {d.method === 'pointbuy' && (
        <Hint>
          Punti spesi: {Number.isFinite(pointBuySpent(d.scores)) ? pointBuySpent(d.scores) : '—'}/
          {POINT_BUY_BUDGET} · costi:{' '}
          {Object.entries(POINT_BUY_COST)
            .map(([s, c]) => `${s}=${c}`)
            .join(' ')}
        </Hint>
      )}
      {d.method === 'roll' && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            icon={Dices}
            onClick={() => set({ rolled: roll4d6DropLowest(), scores: scoresForMethod('roll') })}
          >
            {d.rolled.length ? 'Ritira' : 'Tira 4d6 × 6'}
          </Button>
          {d.rolled.length > 0 && <span className="text-sm tabular-nums">Valori: {d.rolled.join(', ')}</span>}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-muted">
            <th className="py-1 font-medium">Caratteristica</th>
            <th className="py-1 font-medium">Base</th>
            <th className="py-1 font-medium">Background</th>
            <th className="py-1 font-medium">Totale</th>
          </tr>
        </thead>
        <tbody>
          {ABILITIES.map((a) => {
            const total = (d.scores[a] || 0) + bonus[a];
            return (
              <tr key={a} className="border-t border-line">
                <td className="py-1.5">{ABILITY_LABELS[a].long}</td>
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
          Aumenti del background
        </legend>
        <BonusFields
          allowed={bg?.abilities}
          mode={d.bonusMode}
          picks={d.bonusAbilities}
          onChange={(bonusMode, bonusAbilities) => set({ bonusMode, bonusAbilities })}
        />
        <Hint>
          {bg
            ? `${bg.name}: scegli tra ${bg.abilities.map((a) => ABILITY_LABELS[a].long).join(', ')}.`
            : 'Nelle regole 2024 il background indica tre caratteristiche tra cui scegliere.'}{' '}
          Nessun punteggio può superare 20.
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
          Abilità{' '}
          <span className="text-xs font-normal text-muted">
            ({chosen.length} scelte · di solito {suggested}
            {hasBackground ? ' dalla classe' : ': classe + background'})
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
                {fromOrigin && <span className="text-[10px]">(origine)</span>}
              </label>
            );
          })}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Lingue">
          <TagInput
            label="Lingue"
            values={d.languages}
            suggestions={[...STANDARD_LANGUAGES, ...RARE_LANGUAGES]}
            onChange={(languages) => set({ languages })}
          />
        </FieldLabel>
        <FieldLabel label="Strumenti">
          <TagInput label="Strumenti" values={d.tools} onChange={(tools) => set({ tools })} />
        </FieldLabel>
      </div>
      {masteryCount > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            Maestria nelle armi{' '}
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
  const training = CLASSES_BY_KEY.get(d.classKey)?.armor ?? [];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <FieldLabel label="Armatura">
          <Select
            label="Armatura"
            value={d.armorId}
            onValue={(armorId) => set({ armorId })}
            options={[
              { value: '', label: 'Nessuna' },
              ...ARMOR.filter((a) => a.category !== 'shield').map((a) => ({
                value: a.id,
                label: `${a.name} · ${ARMOR_CATEGORY_LABELS[a.category]} · CA ${armorAcText(a)}${training.length && !training.includes(a.category as never) ? ' (senza addestramento)' : ''}`,
              })),
            ]}
          />
        </FieldLabel>
        <label className="flex items-center gap-2 pt-5 text-sm">
          <input type="checkbox" checked={d.shield} onChange={(e) => set({ shield: e.target.checked })} />{' '}
          Scudo
        </label>
        <FieldLabel label="Monete d’oro">
          <input
            aria-label="Monete d'oro"
            inputMode="numeric"
            className={inputClass}
            value={d.gold}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 0) set({ gold: n });
            }}
          />
        </FieldLabel>
      </div>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Armi</h3>
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
      <Hint>Il resto dell’equipaggiamento (zaino, razioni, focus…) si aggiunge dall’Inventario.</Hint>
    </div>
  );
}

export function MagicStep({ d, set }: StepProps) {
  const srd = CLASSES_BY_KEY.get(d.classKey);
  const casts = srd ? srd.caster !== 'none' : true;
  if (!casts) {
    return (
      <p className="text-sm text-muted">{srd?.name} non lancia incantesimi. Puoi saltare questo passo.</p>
    );
  }
  return (
    <div className="space-y-3">
      <FieldLabel label="Caratteristica da incantatore" className="max-w-xs">
        <Select
          label="Caratteristica da incantatore"
          value={d.spellAbility}
          onValue={(v) => set({ spellAbility: v })}
          options={[
            { value: '', label: srd ? '—' : 'Nessuna (non incantatore)' },
            ...(['int', 'wis', 'cha'] as Ability[]).map((a) => ({ value: a, label: ABILITY_LABELS[a].long })),
          ]}
        />
      </FieldLabel>
      <Hint>
        Slot, CD e bonus d’attacco si calcolano da soli. Gli incantesimi si aggiungono poi dal Grimorio
        (libreria o import 5etools).
      </Hint>
    </div>
  );
}
