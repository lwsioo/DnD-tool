import type { ReactNode } from 'react';
import type { InspectorRef } from '@/features/inspector/refs';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/uiStore';

interface InspectorChipProps {
  to: InspectorRef;
  children: ReactNode;
  /** Attenuato: es. Maestria non ancora sbloccata. */
  muted?: boolean;
  title?: string;
  className?: string;
}

/** Etichetta cliccabile che apre una voce nell'Inspector (proprietà, maestria, condizione…). */
export function InspectorChip({ to, children, muted, title, className }: InspectorChipProps) {
  const openInspector = useUiStore((s) => s.openInspector);
  return (
    <button
      type="button"
      title={title}
      onClick={() => openInspector(to)}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
        muted
          ? 'border-line text-muted hover:border-accent/50 hover:text-ink'
          : 'border-accent/40 bg-accent-soft text-accent hover:border-accent',
        className,
      )}
    >
      {children}
    </button>
  );
}
