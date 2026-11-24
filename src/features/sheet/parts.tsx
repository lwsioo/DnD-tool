import type { ReactNode } from 'react';
import type { ProfLevel } from '@/domain/abilities';
import type { Breakdown, RollModeInfo } from '@/engine/types';
import { cn } from '@/lib/cn';
import { formatBonus } from '@/lib/dice';
import { HoverCard } from '@/ui/HoverCard';

/** Contenuto del tooltip di scomposizione: "Mod. DES +2 · Competenza +3 = +5". */
export function BreakdownContent({ breakdown, signed = true }: { breakdown: Breakdown; signed?: boolean }) {
  return (
    <div className="space-y-0.5">
      {breakdown.parts.map((p, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span className="text-muted">{p.label}</span>
          <span className="tabular-nums">{i === 0 && !signed ? p.value : formatBonus(p.value)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-3 border-t border-line pt-1 font-semibold">
        <span>Totale</span>
        <span className="tabular-nums">{signed ? formatBonus(breakdown.total) : breakdown.total}</span>
      </div>
    </div>
  );
}

/** Valore con scomposizione al passaggio del mouse / focus. */
export function Explained({
  breakdown,
  signed = true,
  className,
  children,
}: {
  breakdown: Breakdown;
  signed?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <HoverCard content={<BreakdownContent breakdown={breakdown} signed={signed} />}>
      <span tabIndex={0} className={cn('cursor-help rounded tabular-nums outline-offset-2', className)}>
        {children ?? (signed ? formatBonus(breakdown.total) : breakdown.total)}
      </span>
    </HoverCard>
  );
}

/** Badge vantaggio/svantaggio con l'elenco delle fonti. */
export function RollBadge({ info }: { info: RollModeInfo }) {
  if (info.mode === 'normal') return null;
  const label = { advantage: 'VANT', disadvantage: 'SVANT', cancelled: 'V/S' }[info.mode];
  const title = {
    advantage: 'Vantaggio',
    disadvantage: 'Svantaggio',
    cancelled: 'Vantaggio e svantaggio si annullano',
  }[info.mode];
  return (
    <HoverCard
      content={
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          {info.advantage.length > 0 && <p className="text-ok">Vantaggio: {info.advantage.join(', ')}</p>}
          {info.disadvantage.length > 0 && (
            <p className="text-danger">Svantaggio: {info.disadvantage.join(', ')}</p>
          )}
        </div>
      }
    >
      <span
        tabIndex={0}
        aria-label={`${title}: ${[...info.advantage, ...info.disadvantage].join(', ')}`}
        className={cn(
          'cursor-help rounded px-1 py-px text-[10px] font-bold tracking-wide',
          info.mode === 'advantage' && 'bg-ok/15 text-ok',
          info.mode === 'disadvantage' && 'bg-danger/15 text-danger',
          info.mode === 'cancelled' && 'bg-panel-2 text-muted',
        )}
      >
        {label}
      </span>
    </HoverCard>
  );
}

const PROF_TITLES: Record<ProfLevel, string> = {
  0: 'Nessuna competenza',
  0.5: 'Metà competenza',
  1: 'Competenza',
  2: 'Maestria',
};

/** Indicatore di competenza: ○ nessuna, ◐ metà, ● competente, ◉ maestria. Cliccabile in modalità Modifica. */
export function ProfMarker({
  level,
  onCycle,
  subject,
}: {
  level: ProfLevel;
  onCycle?: () => void;
  subject: string;
}) {
  const dot = (
    <span
      className={cn(
        'relative inline-block size-3 rounded-full border',
        level === 0 && 'border-muted/60',
        level === 0.5 && 'border-accent bg-[linear-gradient(90deg,var(--c-accent)_50%,transparent_50%)]',
        level === 1 && 'border-accent bg-accent',
        level === 2 && 'border-accent bg-accent ring-2 ring-accent/40 ring-offset-1 ring-offset-panel',
      )}
    />
  );
  const title = `${PROF_TITLES[level]}${onCycle ? ' (clic per cambiare)' : ''}`;
  if (!onCycle) {
    return (
      <span
        title={title}
        aria-label={`${subject}: ${PROF_TITLES[level]}`}
        className="grid size-5 place-items-center"
      >
        {dot}
      </span>
    );
  }
  return (
    <button
      type="button"
      title={title}
      aria-label={`${subject}: ${PROF_TITLES[level]}. Cambia`}
      onClick={onCycle}
      className="grid size-5 place-items-center rounded hover:bg-panel-2"
    >
      {dot}
    </button>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn('rounded-xl border border-line bg-panel p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
