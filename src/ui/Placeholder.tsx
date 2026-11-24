import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Step della roadmap in cui la sezione verrà implementata. */
  step?: number;
  children?: ReactNode;
}

/** Stato vuoto / segnaposto per le sezioni non ancora implementate. */
export function Placeholder({ icon: Icon, title, description, step, children }: PlaceholderProps) {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-line bg-panel-2 text-accent">
        <Icon className="size-7" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-display text-xl tracking-wide">{title}</h2>
        <p className="max-w-md text-sm text-muted">{description}</p>
      </div>
      {step !== undefined && (
        <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
          In arrivo · step {step} della roadmap
        </span>
      )}
      {children}
    </div>
  );
}
