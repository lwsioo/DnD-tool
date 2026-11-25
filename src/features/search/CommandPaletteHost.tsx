import { Component, lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { m as msg } from '@/i18n';

type PaletteProps = { onClose: () => void };
const loadPalette = () =>
  import('./CommandPalette').then((m) => ({ default: m.PaletteBody as ComponentType<PaletteProps> }));

/** Ricerca globale (Ctrl+K) su voci, incantesimi, personaggi, privilegi, oggetti e regole, più i comandi rapidi. */
export function CommandPaletteHost() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  // Un caricamento fallito resta in memoria in React.lazy: per riprovare serve un nuovo lazy.
  const [attempt, setAttempt] = useState(0);
  const [PaletteBody, setPaletteBody] = useState(() => lazy(loadPalette));
  if (!open) return null;
  const close = () => setOpen(false);
  return (
    <PaletteErrorBoundary
      key={attempt}
      onClose={close}
      onRetry={() => {
        setPaletteBody(() => lazy(loadPalette));
        setAttempt((n) => n + 1);
      }}
    >
      <Suspense fallback={null}>
        <PaletteBody onClose={close} />
      </Suspense>
    </PaletteErrorBoundary>
  );
}

interface BoundaryProps {
  onClose: () => void;
  onRetry: () => void;
  children: ReactNode;
}

/** Se la ricerca non si carica o va in errore, lo dice invece di non fare nulla. */
class PaletteErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Ricerca globale non disponibile:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Dialog
        open
        onClose={this.props.onClose}
        title={msg.search.unavailable}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              {msg.search.reload}
            </Button>
            <Button variant="primary" onClick={this.props.onRetry} data-autofocus>
              {msg.search.retry}
            </Button>
          </>
        }
      >
        <p className="text-sm">{msg.search.errorIntro}</p>
        <p className="mt-2 rounded-md border border-danger/40 bg-danger/10 p-2 font-mono text-xs break-words text-danger">
          {this.state.error.message || String(this.state.error)}
        </p>
      </Dialog>
    );
  }
}
