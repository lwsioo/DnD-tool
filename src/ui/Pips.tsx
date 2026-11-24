import { cn } from '@/lib/cn';
import { StepButton } from './fields';
import { Minus, Plus } from 'lucide-react';

interface UsesCounterProps {
  max: number;
  used: number;
  onUsed: (used: number) => void;
  label: string;
  /** Oltre questa soglia si mostra "rimasti/max" con −/+ invece dei pallini. */
  pipLimit?: number;
}

/**
 * Contatore usi: pallini pieni = usi rimasti. Clic su un pallino pieno ne spende fino a lì,
 * su uno vuoto li recupera fino a lì. Con molti usi (es. Imposizione delle Mani) diventa un contatore −/+.
 */
export function UsesCounter({ max, used, onUsed, label, pipLimit = 10 }: UsesCounterProps) {
  const remaining = Math.max(0, max - used);
  if (max <= 0) return <span className="text-xs text-muted">—</span>;

  if (max > pipLimit) {
    return (
      <span className="inline-flex items-center gap-1.5" role="group" aria-label={label}>
        <StepButton
          label={`Spendi 1 ${label}`}
          onClick={() => onUsed(Math.min(max, used + 1))}
          disabled={remaining <= 0}
        >
          <Minus className="size-3" aria-hidden />
        </StepButton>
        <span className="min-w-12 text-center text-sm tabular-nums">
          {remaining}
          <span className="text-muted">/{max}</span>
        </span>
        <StepButton
          label={`Recupera 1 ${label}`}
          onClick={() => onUsed(Math.max(0, used - 1))}
          disabled={used <= 0}
        >
          <Plus className="size-3" aria-hidden />
        </StepButton>
      </span>
    );
  }

  return (
    <span
      className="inline-flex flex-wrap gap-1"
      role="group"
      aria-label={`${label}: ${remaining} su ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i < remaining;
        return (
          <button
            key={i}
            type="button"
            aria-label={filled ? `Spendi fino a ${i} rimasti` : `Recupera fino a ${i + 1} rimasti`}
            onClick={() => onUsed(max - (filled ? i : i + 1))}
            className={cn(
              'size-3.5 rounded-full border transition-colors',
              filled ? 'border-accent bg-accent' : 'border-line bg-transparent hover:border-accent/60',
            )}
          />
        );
      })}
    </span>
  );
}
