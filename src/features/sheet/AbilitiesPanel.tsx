import { ABILITY_LABELS } from '@/data/i18n/it';
import { ABILITIES, SKILLS, type Ability, type ProfLevel } from '@/domain/abilities';
import { cn } from '@/lib/cn';
import { formatBonus } from '@/lib/dice';
import { NumberField } from '@/ui/fields';
import { Explained, Panel, ProfMarker, RollBadge } from './parts';
import { useSheet } from './SheetContext';
import { m } from '@/i18n';

/** Giro delle competenze in modalità Modifica. Abilità: nessuna → competenza → maestria → metà → nessuna. */
const nextSkillProf = (p: ProfLevel): ProfLevel => (({ 0: 1, 1: 2, 2: 0.5, 0.5: 0 }) as const)[p];
const nextSaveProf = (p: ProfLevel): ProfLevel => (p === 0 ? 1 : 0);

export function AbilityGrid() {
  const { character: c, derived: d, edit, mutateLater } = useSheet();
  return (
    <section
      aria-label={m.sheet.abilities}
      className="grid grid-cols-3 gap-2 @lg:grid-cols-6 @2xl:grid-cols-2 @5xl:grid-cols-1"
    >
      {ABILITIES.map((ab) => {
        const stat = d.abilities[ab];
        return (
          <div
            key={ab}
            className="flex flex-col items-center gap-1 rounded-xl border border-line bg-panel px-2 py-2.5"
          >
            <span title={ABILITY_LABELS[ab].long} className="text-xs font-bold tracking-wider text-muted">
              {ABILITY_LABELS[ab].short}
            </span>
            <span className="font-display text-2xl tabular-nums">{formatBonus(stat.mod)}</span>
            {edit ? (
              <span className="flex items-center gap-1">
                <NumberField
                  label={m.sheet.abilityBase(ABILITY_LABELS[ab].long)}
                  value={c.abilities[ab].base}
                  min={1}
                  max={30}
                  className="w-12 px-1"
                  onValue={(v) => mutateLater(`ability.${ab}.base`, (x) => void (x.abilities[ab].base = v))}
                />
                <NumberField
                  label={m.sheet.abilityBonus(ABILITY_LABELS[ab].long)}
                  value={c.abilities[ab].bonus}
                  min={-10}
                  max={10}
                  className="w-11 px-1"
                  onValue={(v) => mutateLater(`ability.${ab}.bonus`, (x) => void (x.abilities[ab].bonus = v))}
                />
              </span>
            ) : (
              <Explained
                breakdown={{ total: stat.score, parts: stat.parts }}
                signed={false}
                className="rounded-full border border-line px-2 text-sm"
              >
                {stat.score}
              </Explained>
            )}
          </div>
        );
      })}
      {edit && (
        <p className="col-span-full text-[11px] text-muted">
          Punteggio base · incrementi (background, aumenti, talenti)
        </p>
      )}
    </section>
  );
}

function RollRow({
  label,
  sub,
  prof,
  onCycle,
  stat,
}: {
  label: string;
  sub?: string;
  prof: ProfLevel;
  onCycle?: () => void;
  stat: Parameters<typeof Explained>[0]['breakdown'] & Parameters<typeof RollBadge>[0]['info'];
}) {
  return (
    <li className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-panel-2/60">
      <ProfMarker level={prof} onCycle={onCycle} subject={label} />
      <span className="flex-1 truncate text-sm">
        {label}
        {sub && <span className="ml-1 text-[11px] text-muted">{sub}</span>}
      </span>
      <RollBadge info={stat} />
      <Explained breakdown={stat} className={cn('w-8 text-right text-sm font-semibold')} />
    </li>
  );
}

export function SavesList() {
  const { character: c, derived: d, edit, mutate } = useSheet();
  return (
    <Panel title={m.sheet.saves}>
      <ul className="space-y-0.5">
        {ABILITIES.map((ab: Ability) => (
          <RollRow
            key={ab}
            label={ABILITY_LABELS[ab].long}
            prof={d.saves[ab].prof}
            stat={d.saves[ab]}
            onCycle={edit ? () => mutate((x) => void (x.saves[ab] = nextSaveProf(c.saves[ab]))) : undefined}
          />
        ))}
      </ul>
    </Panel>
  );
}

export function SkillsList() {
  const { character: c, derived: d, edit, mutate } = useSheet();
  return (
    <Panel title={m.sheet.skills}>
      <ul className="space-y-0.5">
        {SKILLS.map((s) => {
          const stat = d.skills[s];
          return (
            <RollRow
              key={s}
              label={stat.label}
              sub={ABILITY_LABELS[stat.ability].short}
              prof={stat.prof}
              stat={stat}
              onCycle={
                edit
                  ? () => mutate((x) => void (x.skills[s].prof = nextSkillProf(c.skills[s].prof)))
                  : undefined
              }
            />
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted">
        {m.sheet.passives(d.passive.investigation.total, d.passive.insight.total)}
      </p>
    </Panel>
  );
}
