import { registerSW } from 'virtual:pwa-register';
import { toast } from '@/stores/toastStore';
import { m } from '@/i18n';

/**
 * Registra il service worker (solo nella build di produzione). Quando è pronta una nuova versione
 * dell'app lo dice con una notifica: si aggiorna solo se l'utente lo chiede, così non perde il lavoro.
 */
export function setupPwa(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh() {
      toast({
        message: m.app.pwa.update,
        duration: 0,
        action: { label: m.app.pwa.updateAction, onClick: () => void update(true) },
      });
    },
    onOfflineReady() {
      toast({ tone: 'success', message: m.app.pwa.offlineReady });
    },
  });
}
