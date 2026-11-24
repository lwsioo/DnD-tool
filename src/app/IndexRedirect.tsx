import { Navigate } from 'react-router';
import { useActiveCharacter } from '@/hooks/useActiveCharacter';

/** "/" apre la scheda dell'ultimo personaggio usato, oppure la schermata di benvenuto. */
export function IndexRedirect() {
  const active = useActiveCharacter();
  if (active.status === 'loading') return null;
  if (active.status === 'ready') return <Navigate to={`/pg/${active.character.id}/scheda`} replace />;
  return <Navigate to="/benvenuto" replace />;
}
