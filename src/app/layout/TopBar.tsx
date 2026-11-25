import { Menu, PanelRight, Search } from 'lucide-react';
import { useLocation } from 'react-router';
import { IconButton } from '@/ui/IconButton';
import { useUiStore } from '@/stores/uiStore';
import { SaveIndicator } from './SaveIndicator';
import { m } from '@/i18n';

const SECTION_TITLES: Array<[RegExp, string]> = [
  [/^\/benvenuto/, m.app.nav.welcome],
  [/^\/nuovo/, m.app.nav.newCharacter],
  [/^\/pg\/[^/]+\/scheda/, m.app.nav.sheet],
  [/^\/pg\/[^/]+\/grimorio/, m.app.nav.grimoire],
  [/^\/pg\/[^/]+\/inventario/, m.app.nav.inventory],
  [/^\/campagna/, m.app.nav.wiki],
  [/^\/compendio/, m.app.nav.compendium],
  [/^\/impostazioni/, m.app.nav.settings],
];

export function TopBar() {
  const { pathname } = useLocation();
  const title = SECTION_TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Codex';
  const inspectorOpen = useUiStore((s) => s.inspectorOpen);
  const toggleInspector = useUiStore((s) => s.toggleInspector);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-3 lg:px-5">
      <IconButton
        icon={Menu}
        label={m.app.topbar.openMenu}
        className="lg:hidden"
        onClick={() => useUiStore.getState().setSidebarOpen(true)}
      />
      <h1 className="font-display text-lg tracking-wide">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <span data-tour="save">
          <SaveIndicator />
        </span>

        <button
          type="button"
          data-tour="search"
          onClick={() => useUiStore.getState().setPaletteOpen(true)}
          title={m.app.topbar.searchTitle}
          className="flex h-8 items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-ink"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="hidden md:inline">{m.app.topbar.search}</span>
          <kbd className="rounded border border-line px-1 font-sans text-[10px]">Ctrl K</kbd>
        </button>

        <IconButton
          icon={PanelRight}
          label={inspectorOpen ? m.app.topbar.closeInspector : m.app.topbar.openInspector}
          data-tour="inspector"
          active={inspectorOpen}
          onClick={toggleInspector}
        />
      </div>
    </header>
  );
}
