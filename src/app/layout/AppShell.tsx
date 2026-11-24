import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BackupReminder } from '@/features/backup/BackupReminder';
import { TourHost } from '@/features/onboarding/tour/TourHost';
import { CommandPaletteHost } from '@/features/search/CommandPaletteHost';
import { WikiLinkProvider } from '@/features/wiki/wikilink/WikiLinkProvider';
import { useUiStore } from '@/stores/uiStore';
import { Toaster } from '@/ui/Toaster';
import { useGlobalShortcuts } from '../shortcuts';
import { InspectorDrawer } from './InspectorDrawer';
import { LeftSidebar } from './LeftSidebar';
import { TopBar } from './TopBar';

/**
 * Layout a 3 pannelli:
 *  - sinistra: selettore personaggio, navigazione, widget vitali (sempre visibili; a scomparsa sotto 1024 px)
 *  - centro: sezione corrente (Outlet del router)
 *  - destra: Inspector contestuale (agganciato ≥1280px, in overlay sotto)
 * Tutto è dentro WikiLinkProvider, così i [[collegamenti]] funzionano ovunque (note, wiki, Inspector).
 */
export function AppShell() {
  useGlobalShortcuts();
  const { pathname } = useLocation();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  // Cambiando pagina, la barra laterale a scomparsa si richiude.
  useEffect(() => {
    useUiStore.getState().setSidebarOpen(false);
  }, [pathname]);

  return (
    <WikiLinkProvider>
      <a
        href="#contenuto"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('contenuto')?.focus();
        }}
        className="sr-only z-[80] rounded-md bg-accent px-3 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Vai al contenuto
      </a>
      <div className="flex h-full overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            aria-hidden
            onClick={() => useUiStore.getState().setSidebarOpen(false)}
          />
        )}
        <LeftSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <BackupReminder />
          <div id="contenuto" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto outline-none">
            <Outlet />
          </div>
        </main>
        <InspectorDrawer />
        <Toaster />
        <CommandPaletteHost />
        <TourHost />
      </div>
    </WikiLinkProvider>
  );
}
