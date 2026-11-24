import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** tailwind-merge con i colori del tema, così `text-muted` e `text-sm` non vengono confusi. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'bg',
        'panel',
        'panel-2',
        'line',
        'ink',
        'muted',
        'accent',
        'accent-ink',
        'accent-soft',
        'hp',
        'danger',
        'ok',
      ],
    },
  },
});

/** Combina classi condizionali; in caso di conflitto (es. `w-full` e `w-10`) vince l'ultima. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
