import { Command } from 'cmdk';
import {
  BookOpen,
  ChevronRight,
  ScrollText,
  Search,
  Shield,
  Sparkles,
  Swords,
  Terminal,
  UserRound,
} from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { exportFullBackupToFile } from '@/features/backup/actions';
import { useWikiLinks } from '@/features/wiki/wikilink/WikiLinkContext';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { Dialog } from '@/ui/Dialog';
import { buildCommands, filterCommands } from './commands';
import { parseQuery, searchGrouped, type SearchHit, type SearchKind } from './searchIndex';
import { useSearchIndex } from './useSearchIndex';

const KIND_ICONS: Record<SearchKind, typeof Search> = {
  wiki: BookOpen,
  spell: Sparkles,
  character: UserRound,
  feature: ScrollText,
  item: Swords,
  rule: Shield,
};

const itemClass =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm data-[selected=true]:bg-accent-soft data-[selected=true]:text-ink';

/** Contenuto della palette: caricato solo alla prima apertura (cmdk e MiniSearch non pesano sul bundle iniziale). */
export function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const navigate = useNavigate();
  const openInspector = useUiStore((s) => s.openInspector);
  const theme = useUiStore((s) => s.theme);
  const wiki = useWikiLinks();
  const active = useActiveCharacter().character;
  const index = useSearchIndex(true);

  const parsed = parseQuery(query);
  const groups = useMemo(() => (index ? searchGrouped(index, parseQuery(query)) : []), [index, query]);
  const hits = useMemo(() => new Map(groups.flatMap((g) => g.hits.map((h) => [h.id, h] as const))), [groups]);

  const commands = buildCommands({
    navigate,
    active,
    campaignId: wiki?.campaignId ?? active?.campaignId ?? null,
    theme,
    toggleTheme: () => useUiStore.getState().toggleTheme(),
    openRest: (kind) => useUiStore.getState().setRestDialog(kind),
    createWikiEntry: () => wiki?.requestCreate(''),
    exportBackup: () =>
      void exportFullBackupToFile().then((name) =>
        toast({ tone: 'success', message: `Backup scaricato: ${name}` }),
      ),
  });
  const shownCommands =
    parsed.mode === 'command' || query.trim() === '' ? filterCommands(commands, parsed.text) : [];

  const open = (hit: SearchHit, page: boolean) => {
    onClose();
    if ((page || !hit.ref) && hit.path) navigate(hit.path);
    else if (hit.ref) openInspector(hit.ref);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      const hit = hits.get(selected);
      if (hit) {
        e.preventDefault();
        open(hit, true);
      }
    }
  };

  const nothing = query.trim() !== '' && parsed.mode !== 'command' && groups.length === 0 && index;

  return (
    <Dialog open onClose={onClose} title="Cerca" size="lg">
      <Command
        shouldFilter={false}
        value={selected}
        onValueChange={setSelected}
        onKeyDown={onKeyDown}
        label="Ricerca globale"
        className="space-y-2"
      >
        <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-2.5 focus-within:border-accent">
          <Search className="size-4 text-muted" aria-hidden />
          <Command.Input
            data-autofocus
            value={query}
            onValueChange={setQuery}
            placeholder="Cerca voci, incantesimi, regole… ( > comandi · @ voci · # tag )"
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
        </div>

        <Command.List className="max-h-[55vh] overflow-y-auto">
          {nothing && (
            <p className="px-2.5 py-6 text-center text-sm text-muted">
              Nessun risultato per “{parsed.text}”.
            </p>
          )}
          {!index && query && <p className="px-2.5 py-3 text-sm text-muted">Preparo l’indice…</p>}

          {groups.map((g) => {
            const Icon = KIND_ICONS[g.kind];
            return (
              <Command.Group
                key={g.kind}
                heading={g.label}
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase"
              >
                {g.hits.map((h) => (
                  <Command.Item key={h.id} value={h.id} onSelect={() => open(h, false)} className={itemClass}>
                    <Icon className="size-4 shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{h.title}</span>
                    <span className="truncate text-xs text-muted">{h.subtitle}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            );
          })}

          {shownCommands.length > 0 && (
            <Command.Group
              heading="Comandi"
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase"
            >
              {shownCommands.map((c) => (
                <Command.Item
                  key={c.id}
                  value={`cmd:${c.id}`}
                  onSelect={() => {
                    onClose();
                    c.run();
                  }}
                  className={itemClass}
                >
                  <Terminal className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="flex-1">{c.label}</span>
                  <ChevronRight className="size-3.5 text-muted" aria-hidden />
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <p className="border-t border-line pt-2 text-[11px] text-muted">
          ↑↓ per scegliere · Invio: anteprima nel pannello · Ctrl+Invio: apri la pagina · Esc per chiudere
        </p>
      </Command>
    </Dialog>
  );
}
