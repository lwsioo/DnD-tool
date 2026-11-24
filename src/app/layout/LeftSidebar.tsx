import {
  Backpack,
  BookOpen,
  Library,
  Moon,
  ScrollText,
  Settings,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';
import { cn } from '@/lib/cn';
import { IconButton } from '@/ui/IconButton';
import { useUiStore } from '@/stores/uiStore';
import { CharacterSwitcher } from './CharacterSwitcher';
import { VitalsPanel } from '@/features/vitals/VitalsPanel';

interface NavItem {
  label: string;
  icon: LucideIcon;
  /** null = sezione non raggiungibile finché non c'è un personaggio attivo. */
  to: string | null;
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
    isActive ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-panel-2 hover:text-ink',
  );

export function LeftSidebar() {
  const theme = useUiStore((s) => s.theme);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const active = useActiveCharacter();
  const character = active.character;
  const base = character ? `/pg/${character.id}` : null;

  const nav: NavItem[] = [
    { label: 'Scheda', icon: ScrollText, to: base && `${base}/scheda` },
    { label: 'Grimorio', icon: Sparkles, to: base && `${base}/grimorio` },
    { label: 'Campagna Wiki', icon: BookOpen, to: `/campagna/${character?.campaignId ?? ''}` },
    { label: 'Inventario', icon: Backpack, to: base && `${base}/inventario` },
  ];

  return (
    <aside
      aria-label="Barra laterale"
      className={cn(
        'w-[260px] shrink-0 flex-col border-r border-line bg-panel lg:flex',
        // Sotto 1024 px è a scomparsa e si apre sopra il contenuto.
        sidebarOpen ? 'fixed inset-y-0 left-0 z-40 flex shadow-2xl' : 'hidden',
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
        <img src="/favicon.svg" alt="" className="size-6" />
        <span className="font-display text-lg tracking-widest">Codex</span>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        <div data-tour="characters">
          <CharacterSwitcher />
        </div>

        <nav aria-label="Sezioni" data-tour="nav" className="space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) =>
            to ? (
              <NavLink key={label} to={to} className={navItemClass}>
                <Icon className="size-4" aria-hidden />
                {label}
              </NavLink>
            ) : (
              <span
                key={label}
                aria-disabled="true"
                title="Crea o seleziona un personaggio"
                className="flex cursor-not-allowed items-center gap-2.5 px-2.5 py-1.5 text-sm text-muted/50"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </span>
            ),
          )}
        </nav>

        <div data-tour="vitals">
          <VitalsPanel />
        </div>
      </div>

      <div className="shrink-0 border-t border-line px-2 pt-2">
        <NavLink to="/compendio" data-tour="compendium" className={navItemClass}>
          <Library className="size-4" aria-hidden /> Compendio
        </NavLink>
      </div>
      <div className="flex shrink-0 items-center gap-1 p-2 pt-0.5">
        <NavLink to="/impostazioni" data-tour="settings" className={(s) => cn(navItemClass(s), 'flex-1')}>
          <Settings className="size-4" aria-hidden /> Impostazioni
        </NavLink>
        <IconButton
          icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
          onClick={toggleTheme}
        />
      </div>
    </aside>
  );
}
