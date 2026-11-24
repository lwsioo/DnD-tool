import type { ReactNode } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatDistance } from '@/lib/units';
import { formatBonus } from '@/lib/dice';
import { NumberField, Select } from '@/ui/fields';
import { Explained, RollBadge } from './parts';
import { useSheet } from './SheetContext';

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
        `${{ fly: 'Volo', swim: 'Nuoto', climb: 'Scalata', burrow: 'Scavo' }[k]} ${formatDistance(d.speed[k]!.total, units)}`,
    );

  return (
    <section aria-label="Combattimento" className="flex flex-wrap gap-2">
      <Stat label="Competenza">{formatBonus(d.pb)}</Stat>

      <Stat label="Iniziativa">
        <Explained breakdown={d.initiative} />
        <RollBadge info={d.initiative} />
      </Stat>

      <Stat
        label="Classe Armatura"
        hint={d.ac.override ? 'manuale' : d.ac.shieldIgnored ? 'scudo senza addestramento' : d.ac.basis}
      >
        {edit ? (
          <NumberField
            label="CA manuale (vuoto = automatica)"
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
            auto
          </button>
        )}
      </Stat>

      <Stat label="Velocità" hint={otherSpeeds.join(' · ') || undefined}>
        {edit ? (
          <NumberField
            label="Velocità base in piedi"
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

      <Stat label="Percezione passiva">
        <Explained breakdown={d.passive.perception} signed={false} />
      </Stat>

      <Stat label="PF massimi" hint={c.combat.hp.maxMode === 'auto' ? 'calcolati' : 'manuali'}>
        {edit && c.combat.hp.maxMode === 'manual' ? (
          <NumberField
            label="PF massimi"
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
            label="Calcolo PF massimi"
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
              { value: 'auto', label: 'Auto' },
              { value: 'manual', label: 'Manuale' },
            ]}
          />
        )}
      </Stat>

      <Stat label="Dadi vita">
        <span className="text-base">
          {d.hitDice.length === 0
            ? '—'
            : d.hitDice.map((h) => `${h.remaining}/${h.total}d${h.die}`).join(' · ')}
        </span>
      </Stat>

      <Stat
        label="Indebolimento"
        hint={c.combat.exhaustion ? `−${2 * c.combat.exhaustion} ai d20` : undefined}
      >
        <NumberField
          stepper
          label="Indebolimento"
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
