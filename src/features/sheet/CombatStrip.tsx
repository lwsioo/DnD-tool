import type { ReactNode } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatDistance } from '@/lib/units';
import { formatBonus } from '@/lib/dice';
import { NumberField, Select } from '@/ui/fields';
import { Explained, RollBadge } from './parts';
import { useSheet } from './SheetContext';
import { m } from '@/i18n';

function Stat({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex min-w-24 flex-1 flex-col items-center gap-1 rounded-lg border border-line bg-bg/40 px-3 py-2 text-center">
      <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">{label}</span>
      <span className="flex items-center gap-1 font-display text-xl">{children}</span>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

/** Statistiche di combattimento derivate; in modalità Modifica espone i valori base. */
export function CombatStrip() {
  const { character: c, derived: d, edit, mutate, mutateLater } = useSheet();
  const { units } = useAppSettings();
  const otherSpeeds = (['fly', 'swim', 'climb', 'burrow'] as const)
    .filter((k) => d.speed[k])
    .map(
      (k) =>
        `${m.sheet.speeds[k]} ${formatDistance(d.speed[k]!.total, units)}`,
    );

  return (
    <section aria-label={m.sheet.combat} className="flex flex-wrap gap-2">
      <Stat label={m.sheet.proficiencyBonus}>{formatBonus(d.pb)}</Stat>

      <Stat label={m.sheet.initiative}>
        <Explained breakdown={d.initiative} />
        <RollBadge info={d.initiative} />
      </Stat>

      <Stat
        label={m.sheet.armorClass}
        hint={d.ac.override ? m.sheet.acManual : d.ac.shieldIgnored ? m.sheet.acShieldIgnored : d.ac.basis}
      >
        {edit ? (
          <NumberField
            label={m.sheet.acOverride}
            value={c.combat.acOverride ?? d.ac.total}
            min={0}
            max={40}
            className="w-16"
            onValue={(v) => mutateLater('combat.acOverride', (x) => void (x.combat.acOverride = v))}
          />
        ) : (
          <Explained breakdown={d.ac} signed={false} />
        )}
        {edit && c.combat.acOverride !== undefined && (
          <button
            type="button"
            className="text-[11px] text-accent hover:underline"
            onClick={() => mutate((x) => void delete x.combat.acOverride)}
          >
            {m.sheet.auto}
          </button>
        )}
      </Stat>

      <Stat label={m.sheet.speed} hint={otherSpeeds.join(' · ') || undefined}>
        {edit ? (
          <NumberField
            label={m.sheet.baseSpeedFeet}
            value={c.combat.speed.walk}
            min={0}
            max={300}
            className="w-16"
            onValue={(v) => mutateLater('combat.speed.walk', (x) => void (x.combat.speed.walk = v))}
          />
        ) : (
          <Explained breakdown={d.speed.walk} signed={false}>
            {formatDistance(d.speed.walk.total, units)}
          </Explained>
        )}
      </Stat>

      <Stat label={m.sheet.passivePerception}>
        <Explained breakdown={d.passive.perception} signed={false} />
      </Stat>

      <Stat label={m.sheet.maxHp} hint={c.combat.hp.maxMode === 'auto' ? m.sheet.hpComputed : m.sheet.hpManual}>
        {edit && c.combat.hp.maxMode === 'manual' ? (
          <NumberField
            label={m.sheet.maxHp}
            value={c.combat.hp.maxManual ?? 0}
            min={0}
            max={999}
            className="w-16"
            onValue={(v) => mutateLater('combat.hp.maxManual', (x) => void (x.combat.hp.maxManual = v))}
          />
        ) : (
          <Explained breakdown={d.hp.max} signed={false} />
        )}
        {edit && (
          <Select
            label={m.sheet.hpMode}
            value={c.combat.hp.maxMode}
            className="w-auto py-0.5 text-xs"
            onValue={(v) =>
              mutate((x) => {
                x.combat.hp.maxMode = v;
                if (v === 'manual' && x.combat.hp.maxManual === undefined)
                  x.combat.hp.maxManual = d.hp.max.total;
              })
            }
            options={[
              { value: 'auto', label: m.sheet.modeAuto },
              { value: 'manual', label: m.sheet.modeManual },
            ]}
          />
        )}
      </Stat>

      <Stat label={m.sheet.hitDice}>
        <span className="text-base">
          {d.hitDice.length === 0
            ? '—'
            : d.hitDice.map((h) => `${h.remaining}/${h.total}d${h.die}`).join(' · ')}
        </span>
      </Stat>

      <Stat
        label={m.sheet.exhaustion}
        hint={c.combat.exhaustion ? m.sheet.exhaustionHint(2 * c.combat.exhaustion) : undefined}
      >
        <NumberField
          stepper
          label={m.sheet.exhaustion}
          value={c.combat.exhaustion}
          min={0}
          max={6}
          className="w-10 px-1"
          onValue={(v) => mutate((x) => void (x.combat.exhaustion = v as typeof x.combat.exhaustion))}
        />
      </Stat>
    </section>
  );
}
