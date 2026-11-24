import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface HoverCardProps {
  /** Contenuto del pannello; se null il wrapper non mostra nulla. */
  content: ReactNode | null;
  children: ReactNode;
  className?: string;
}

const WIDTH = 240;

/**
 * Pannello informativo che appare al passaggio del mouse o al focus da tastiera.
 * Renderizzato in un portale con posizione fissa, così non viene tagliato dai contenitori scorrevoli.
 */
export function HoverCard({ content, children, className }: HoverCardProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - WIDTH / 2), window.innerWidth - WIDTH - 8);
    const below = r.bottom + 6;
    setPos({ top: below + 160 > window.innerHeight ? Math.max(8, r.top - 6 - 160) : below, left });
  };
  const hide = () => setPos(null);

  if (content === null) return <span className={className}>{children}</span>;

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={pos ? id : undefined}
    >
      {children}
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ top: pos.top, left: pos.left, width: WIDTH }}
            className="pointer-events-none fixed z-[70] rounded-lg border border-line bg-panel p-2.5 text-xs shadow-xl"
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
