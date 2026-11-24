/** Fasce scure che coprono lo schermo tranne il riquadro evidenziato. */
export function veil(
  rect: Rect | null,
  viewport: { width: number; height: number },
): Array<{ top: number; left: number; width: number; height: number }> {
  const { width: W, height: H } = viewport;
  if (!rect) return [{ top: 0, left: 0, width: W, height: H }];
  const top = Math.max(0, rect.top);
  const bottom = Math.min(H, rect.top + rect.height);
  const left = Math.max(0, rect.left);
  const right = Math.min(W, rect.left + rect.width);
  return [
    { top: 0, left: 0, width: W, height: top },
    { top: bottom, left: 0, width: W, height: Math.max(0, H - bottom) },
    { top, left: 0, width: left, height: bottom - top },
    { top, left: right, width: Math.max(0, W - right), height: bottom - top },
  ];
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const CARD_WIDTH = 340;
const GAP = 14;
const PAD = 6;

/** Rettangolo dell'elemento del passo, o null se non c'è o non è visibile (es. barra laterale chiusa). */
export function measure(target?: string): Rect | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

/** Posizione della scheda: a destra dell'elemento, altrimenti sotto, sopra o a sinistra; sempre dentro lo schermo. */
export function placeCard(
  rect: Rect | null,
  viewport: { width: number; height: number },
  cardHeight = 220,
): { top: number; left: number } {
  const clampX = (x: number) => Math.max(12, Math.min(x, viewport.width - CARD_WIDTH - 12));
  const clampY = (y: number) => Math.max(12, Math.min(y, viewport.height - cardHeight - 12));
  if (!rect)
    return {
      top: clampY((viewport.height - cardHeight) / 2),
      left: clampX((viewport.width - CARD_WIDTH) / 2),
    };
  const right = rect.left + rect.width + GAP;
  if (right + CARD_WIDTH < viewport.width - 12) return { top: clampY(rect.top), left: right };
  const below = rect.top + rect.height + GAP;
  if (below + cardHeight < viewport.height - 12)
    return { top: below, left: clampX(rect.left + rect.width - CARD_WIDTH) };
  const above = rect.top - GAP - cardHeight;
  if (above > 12) return { top: above, left: clampX(rect.left + rect.width - CARD_WIDTH) };
  return { top: clampY(rect.top), left: clampX(rect.left - GAP - CARD_WIDTH) };
}
