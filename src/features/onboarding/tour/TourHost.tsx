import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { db } from '@/db/db';
import { useUiStore } from '@/stores/uiStore';
import { GuidedTour } from './GuidedTour';
import { TOUR_STEPS } from './steps';

/**
 * Apre da sola la visita guidata al primo avvio: solo se nell'archivio non c'è nessun personaggio,
 * sulla pagina di benvenuto, e se non è già stata vista o saltata. Si può riaprire dalle Impostazioni.
 */
export function TourHost() {
  const open = useUiStore((s) => s.tourOpen);
  const done = useUiStore((s) => s.tourDone);
  const { pathname } = useLocation();
  const characters = useLiveQuery(() => db.characters.count(), []);

  useEffect(() => {
    if (!done && characters === 0 && pathname.startsWith('/benvenuto')) {
      useUiStore.getState().setTourOpen(true);
    }
  }, [done, characters, pathname]);

  if (!open) return null;
  return <GuidedTour steps={TOUR_STEPS} onDone={() => useUiStore.getState().finishTour()} />;
}
