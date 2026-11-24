import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Etichetta accessibile, mostrata anche come tooltip nativo. */
  label: string;
  active?: boolean;
}

export function IconButton({ icon: Icon, label, active, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'grid size-8 place-items-center rounded-md text-muted transition-colors',
        'hover:bg-panel-2 hover:text-ink disabled:pointer-events-none disabled:opacity-35',
        active && 'bg-accent-soft text-accent',
        className,
      )}
      {...rest}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
