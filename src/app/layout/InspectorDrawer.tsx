import { ChevronLeft, ChevronRight, MousePointerClick, Pin, X } from 'lucide-react';
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { InspectorHost } from '@/features/inspector/InspectorHost';
import { KIND_LABELS, refKey } from '@/features/inspector/refs';
import { IconButton } from '@/ui/IconButton';
import {
  INSPECTOR_MAX_WIDTH,
  INSPECTOR_MIN_WIDTH,
  selectCurrentInspectorRef,
  useUiStore,
} from '@/stores/uiStore';
import { m } from '@/i18n';

/**
 * Pannello destro contestuale.
 * ≥1280px (xl) è agganciato al layout e si ridimensiona trascinando il bordo sinistro;
 * sotto scorre sopra il contenuto con uno sfondo scuro.
 */
export function InspectorDrawer() {
  const open = useUiStore((s) => s.inspectorOpen);
  const pinned = useUiStore((s) => s.inspectorPinned);
  const index = useUiStore((s) => s.inspectorIndex);
  const historyLength = useUiStore((s) => s.inspectorHistory.length);
  const width = useUiStore((s) => s.inspectorWidth);
  const current = useUiStore(selectCurrentInspectorRef);
  const { closeInspector, toggleInspectorPin, inspectorBack, inspectorForward, setInspectorWidth } =
    useUiStore.getState();
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  if (!open) return null;

  const onResizeStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { startX: e.clientX, startWidth: width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setInspectorWidth(drag.current.startWidth + (drag.current.startX - e.clientX));
  };
  const onResizeEnd = () => {
    drag.current = null;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-20 bg-black/40 xl:hidden"
        aria-hidden
        onClick={() => !pinned && closeInspector()}
      />
      <aside
        aria-label={m.app.inspector.region}
        style={{ '--inspector-w': `${width}px` } as React.CSSProperties}
        className="fixed inset-y-0 right-0 z-30 flex w-[min(420px,100vw)] flex-col border-l border-line bg-panel shadow-2xl xl:relative xl:z-auto xl:w-(--inspector-w) xl:shrink-0 xl:shadow-none"
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={m.app.inspector.resize}
          aria-valuemin={INSPECTOR_MIN_WIDTH}
          aria-valuemax={INSPECTOR_MAX_WIDTH}
          aria-valuenow={width}
          title={m.app.inspector.resizeHint}
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          onDoubleClick={() => setInspectorWidth(420)}
          className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize hover:bg-accent/30 xl:block"
        />

        <div className="flex h-14 shrink-0 items-center gap-1 border-b border-line px-3">
          <IconButton
            icon={ChevronLeft}
            label={m.app.inspector.back}
            disabled={index <= 0}
            onClick={inspectorBack}
          />
          <IconButton
            icon={ChevronRight}
            label={m.app.inspector.forward}
            disabled={index >= historyLength - 1}
            onClick={inspectorForward}
          />
          <span className="mx-2 min-w-0 flex-1 truncate text-xs font-semibold tracking-wider text-muted uppercase">
            {current ? KIND_LABELS[current.kind] : m.app.inspector.details}
          </span>
          <IconButton
            icon={Pin}
            label={pinned ? m.app.inspector.unpin : m.app.inspector.pin}
            active={pinned}
            onClick={toggleInspectorPin}
          />
          <IconButton icon={X} label={m.app.inspector.close} onClick={closeInspector} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {current ? (
            <InspectorHost key={refKey(current)} entry={current} />
          ) : (
            <div className="flex flex-col items-center gap-3 pt-16 text-center text-sm text-muted">
              <MousePointerClick className="size-8 text-accent" aria-hidden />
              <p className="max-w-64">{m.app.inspector.empty}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
