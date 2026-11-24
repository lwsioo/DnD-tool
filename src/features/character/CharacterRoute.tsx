import { UserX } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { useCharacter } from '@/hooks/useActiveCharacter';
import { useUiStore } from '@/stores/uiStore';
import { Placeholder } from '@/ui/Placeholder';
import type { CharacterOutletContext } from './useCurrentCharacter';

/**
 * Rotta /pg/:charId — carica il personaggio dall'URL, lo rende "attivo"
 * e lo passa alle sezioni (Scheda, Grimorio, Inventario) tramite l'outlet context.
 */
export function CharacterRoute() {
  const { charId } = useParams();
  const query = useCharacter(charId);
  const setActiveCharacter = useUiStore((s) => s.setActiveCharacter);

  useEffect(() => {
    if (query.status === 'ready') setActiveCharacter(query.character.id);
  }, [query.status, query.character?.id, setActiveCharacter]);

  if (query.status === 'loading') return null;
  if (query.status === 'missing') {
    return (
      <Placeholder
        icon={UserX}
        title="Personaggio non trovato"
        description="Forse è stato eliminato, oppure il link non è più valido."
      >
        <Link to="/benvenuto" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
          Torna all'inizio
        </Link>
      </Placeholder>
    );
  }
  return <Outlet context={{ character: query.character } satisfies CharacterOutletContext} />;
}
