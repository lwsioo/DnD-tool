import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';

/**
 * Scorciatoie globali.
 *  Ctrl/⌘+K   apre e chiude la ricerca globale
 *  Esc        chiude la barra laterale a scomparsa, poi l'Inspector (se non fissato)
 *  Alt+← / →  cronologia dell'Inspector
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ui = useUiStore.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ui.setPaletteOpen(!ui.paletteOpen);
      } else if (e.key === 'Escape' && ui.sidebarOpen) {
        ui.setSidebarOpen(false);
      } else if (e.key === 'Escape' && ui.inspectorOpen && !ui.inspectorPinned) {
        ui.closeInspector();
      } else if (e.altKey && e.key === 'ArrowLeft' && ui.inspectorOpen) {
        e.preventDefault();
        ui.inspectorBack();
      } else if (e.altKey && e.key === 'ArrowRight' && ui.inspectorOpen) {
        e.preventDefault();
        ui.inspectorForward();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
