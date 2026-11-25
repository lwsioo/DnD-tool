import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/ui/Button';
import { CARD_WIDTH, measure, placeCard, veil, type Rect } from './placement';

/** rgba esplicito: alcuni browser non disegnano il nero semitrasparente in oklab generato da Tailwind. */
const VEIL_COLOR = 'rgba(8, 8, 12, 0.62)';
import type { TourStep } from './steps';
import { m } from '@/i18n';

const T = m.onboarding.tour;

interface GuidedTourProps {
  steps: TourStep[];
  /** Chiamata sia alla fine sia saltando: in entrambi i casi la visita non si ripresenta. */
  onDone: () => void;
}

/** Visita guidata a passi: oscura la pagina, mette in evidenza un elemento e ne spiega l'uso. */
export function GuidedTour({ steps, onDone }: GuidedTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const step = steps[index]!;
  const last = index === steps.length - 1;

  const update = useCallback(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    setRect(measure(step.target));
  }, [step.target]);

  useLayoutEffect(() => {
    if (step.target) {
      document.querySelector(`[data-tour="${step.target}"]`)?.scrollIntoView({ block: 'nearest' });
    }
    update();
  }, [step.target, update]);

  useEffect(() => {
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [update]);

  const next = useCallback(() => (last ? onDone() : setIndex((i) => i + 1)), [last, onDone]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [next, back, onDone]);

  const pos = placeCard(rect, viewport);

  return createPortal(
    <div className="fixed inset-0 z-[90]" aria-live="polite">
      {/* Oscuramento: quattro fasce attorno all'elemento evidenziato (o un velo pieno se non c'è). */}
      {veil(rect, viewport).map((s, i) => (
        <div key={i} aria-hidden className="absolute" style={{ ...s, background: VEIL_COLOR }} />
      ))}
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg border-2 border-accent transition-all duration-200"
          style={rect}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={T.region}
        className="absolute space-y-3 rounded-xl border border-line bg-panel p-4 shadow-2xl transition-all duration-200"
        style={{ top: pos.top, left: pos.left, width: CARD_WIDTH }}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              {T.step(index + 1, steps.length)}
            </p>
            <h2 className="font-display text-lg tracking-wide">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={onDone}
            aria-label={T.skipX}
            className="rounded-md p-1 text-muted hover:bg-panel-2 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-sm leading-relaxed">{step.body}</p>

        <div className="flex gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.title}
              className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-line'}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDone}>
            {T.skip}
          </Button>
          <span className="flex-1" />
          {index > 0 && (
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={back}>
              {T.back}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={last ? Check : ArrowRight}
            onClick={next}
            data-autofocus
            autoFocus
          >
            {last ? T.start : index === 0 ? T.begin : T.next}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
