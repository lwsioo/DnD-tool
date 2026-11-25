import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import type { Character } from '@/domain/character';
import { useActiveCharacter, useCharacterList } from '@/hooks/useActiveCharacter';
import { cn } from '@/lib/cn';
import { classSummary } from '@/features/character/useCurrentCharacter';
import { m } from '@/i18n';

function Avatar({ character }: { character?: Character }) {
  const initial = character?.identity.name.trim().charAt(0).toUpperCase() || '?';
  return character?.identity.portrait ? (
    <img src={character.identity.portrait} alt="" className="size-9 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-bg font-display text-accent">
      {initial}
    </span>
  );
}

/** Selettore del personaggio attivo con elenco a discesa. */
export function CharacterSwitcher() {
  const active = useActiveCharacter();
  const characters = useCharacterList();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = active.character;
  const hasCharacters = (characters?.length ?? 0) > 0;

  return (
    <section aria-label={m.app.switcher.region} className="space-y-1.5">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={!hasCharacters}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          title={hasCharacters ? m.app.switcher.change : m.app.switcher.none}
          className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-panel-2 p-2 text-left transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:hover:border-line"
        >
          <Avatar character={current} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {current?.identity.name || m.app.switcher.noCharacter}
            </span>
            <span className="block truncate text-xs text-muted">{current ? classSummary(current) : '—'}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted" aria-hidden />
        </button>

        {open && characters && (
          <ul
            role="listbox"
            aria-label={m.app.switcher.list}
            className="absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-xl"
          >
            {characters.map((c) => {
              const selected = c.id === current?.id;
              return (
                <li key={c.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/pg/${c.id}/scheda`);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-panel-2',
                      selected && 'bg-accent-soft',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{c.identity.name || m.app.switcher.unnamed}</span>
                      <span className="block truncate text-xs text-muted">{classSummary(c)}</span>
                    </span>
                    {selected && <Check className="size-4 text-accent" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <NavLink
        to="/benvenuto"
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-panel-2"
      >
        <Plus className="size-3.5" aria-hidden /> {m.app.nav.newCharacter}
      </NavLink>
    </section>
  );
}
