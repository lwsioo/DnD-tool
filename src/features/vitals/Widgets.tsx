import { Brain, Shield, ShieldHalf, Shirt, X, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import type { InventoryItem } from '@/domain/items';
import { cn } from '@/lib/cn';
import { HoverCard } from '@/ui/HoverCard';
import { UsesCounter } from '@/ui/Pips';
import { BreakdownContent } from '@/features/sheet/parts';
import { setEquipped } from '@/features/inventory/itemActions';
import { useVitals } from './VitalsContext';

function Card({
  label,
  icon,
  children,
  right,
}: {
  label: string;
  icon: ReactNode;
  children?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section aria-label={label} className="rounded-lg border border-line bg-bg/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
          {icon}
          {label}
        </span>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Armatura/scudo "di riferimento" per gli interruttori: quello equipaggiato, altrimenti il primo posseduto. */
function pick(items: InventoryItem[], kind: 'armor' | 'shield') {
  const all = items.filter((i) => i.kind === kind);
  return all.find((i) => i.equipped) ?? all[0];
}

function Toggle({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-1 rounded border px-1.5 py-1 text-[11px] transition-colors',
        on ? 'border-accent/60 bg-accent-soft text-accent' : 'border-line text-muted hover:text-ink',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

/** CA dinamica: gli interruttori equipaggiano/tolgono armatura e scudo e la CA si ricalcola. */
export function AcWidget() {
  const { character: c, derived, mutate } = useVitals();
  const armor = pick(c.inventory.items, 'armor');
  const shield = pick(c.inventory.items, 'shield');

  const toggle = (item: InventoryItem) => mutate((d) => setEquipped(d, item.id, !item.equipped));
  return (
    <Card
      label="Classe Armatura"
      icon={<Shield className="size-3.5 text-accent" aria-hidden />}
      right={
        <HoverCard content={<BreakdownContent breakdown={derived.ac} signed={false} />}>
          <span
            tabIndex={0}
            className="cursor-help font-display text-xl tabular-nums"
            aria-label={`Classe Armatura ${derived.ac.total}`}
          >
            {derived.ac.total}
          </span>
        </HoverCard>
      }
    >
      {(armor || shield) && (
        <div className="mt-2 flex gap-1">
          {armor && (
            <Toggle
              on={armor.equipped}
              onClick={() => toggle(armor)}
              icon={<Shirt className="size-3 shrink-0" aria-hidden />}
              label={armor.name}
            />
          )}
          {shield && (
            <Toggle
              on={shield.equipped}
              onClick={() => toggle(shield)}
              icon={<ShieldHalf className="size-3 shrink-0" aria-hidden />}
              label={shield.name}
            />
          )}
        </div>
      )}
      {derived.ac.shieldIgnored && (
        <p className="mt-1 text-[11px] text-danger">Scudo senza addestramento: nessun bonus.</p>
      )}
    </Card>
  );
}

const ORDINAL = ['1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°'];

/** Slot incantesimo standard e del Patto, spendibili con un clic. */
export function SlotsWidget() {
  const { derived, mutate } = useVitals();
  const levels = derived.slots.standard.filter((s) => s.max > 0);
  const pact = derived.slots.pact;
  if (levels.length === 0 && !pact) return null;

  return (
    <Card label="Slot incantesimo" icon={<Zap className="size-3.5 text-accent" aria-hidden />}>
      <div className="mt-2 space-y-1">
        {levels.map((s) => (
          <div key={s.level} className="flex items-center gap-2">
            <span className="w-6 text-xs text-muted">{ORDINAL[s.level - 1]}</span>
            <UsesCounter
              label={`Slot di ${ORDINAL[s.level - 1]} livello`}
              max={s.max}
              used={s.used}
              onUsed={(used) => mutate((d) => void (d.spellcasting.slots.used[s.level - 1] = used))}
            />
          </div>
        ))}
        {pact && (
          <div className="flex items-center gap-2" title={`Slot del Patto di ${pact.slotLevel}° livello`}>
            <span className="w-6 text-xs text-accent">P{pact.slotLevel}</span>
            <UsesCounter
              label="Slot del Patto"
              max={pact.max}
              used={pact.used}
              onUsed={(used) => mutate((d) => void (d.spellcasting.pact = { used }))}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

/** Incantesimo su cui il personaggio si sta concentrando (si imposta lanciando dal Grimorio). */
export function ConcentrationRow() {
  const { character: c, spellNames, mutate } = useVitals();
  if (!c.combat.concentration) return null;
  const cs = c.spellcasting.spells.find((s) => s.id === c.combat.concentration?.characterSpellId);
  return (
    <div className="mt-2 flex items-center gap-1.5 rounded border border-accent/40 bg-accent-soft/50 px-2 py-1 text-xs">
      <Brain className="size-3.5 text-accent" aria-hidden />
      <span className="flex-1 truncate">
        Concentrazione: <strong>{(cs && spellNames.get(cs.spellId)) ?? 'incantesimo'}</strong>
      </span>
      <button
        type="button"
        aria-label="Termina la concentrazione"
        onClick={() => mutate((d) => void delete d.combat.concentration)}
        className="text-muted hover:text-ink"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** Risorse fissate in barra (privilegi e lanci gratuiti con "In barra laterale"). */
export function ResourcesWidget() {
  const { derived, mutate } = useVitals();
  const pinned = derived.resources.filter((r) => r.pinned && !r.formulaError && r.max > 0);
  if (pinned.length === 0) return null;
  return (
    <Card label="Risorse" icon={<Zap className="size-3.5 text-accent" aria-hidden />}>
      <ul className="mt-2 space-y-1.5">
        {pinned.map((r) => (
          <li key={r.id} className="space-y-0.5">
            <span className="block truncate text-xs" title={r.name}>
              {r.name}
            </span>
            <UsesCounter
              label={r.name}
              max={r.max}
              used={Math.min(r.used, r.max)}
              pipLimit={8}
              onUsed={(used) =>
                mutate((d) => {
                  const tracker =
                    r.kind === 'feature'
                      ? d.features.find((f) => f.id === r.id)?.uses
                      : d.spellcasting.spells.find((s) => s.id === r.id)?.freeUses;
                  if (tracker) tracker.used = used;
                })
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
