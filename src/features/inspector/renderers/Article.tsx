import type { ReactNode } from 'react';
import { m } from '@/i18n';

interface ArticleProps {
  title: string;
  /** Riga sotto il titolo: tipo, livello, nome inglese… */
  subtitle?: string;
  children?: ReactNode;
}

/** Struttura comune delle voci dell'Inspector. */
export function Article({ title, subtitle, children }: ArticleProps) {
  return (
    <article className="space-y-4">
      <header className="space-y-0.5">
        <h2 className="font-display text-xl tracking-wide">{title}</h2>
        {subtitle && <p className="text-sm text-muted italic">{subtitle}</p>}
      </header>
      {children}
    </article>
  );
}

/** Griglia etichetta/valore (Tempo di lancio, Gittata, Danni…). */
export function StatList({ rows }: { rows: Array<[label: string, value: ReactNode] | null | false> }) {
  const visible = rows.filter((r): r is [string, ReactNode] => !!r);
  if (visible.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-line bg-bg/40 p-3 text-sm">
      {visible.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-medium text-muted">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function NotFound({ what }: { what: string }) {
  return <p className="text-sm text-muted">{m.inspector.notFound(what)}</p>;
}
