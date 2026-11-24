import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, settingsRepo, type AppSettings } from '@/db/repos/settings';

/** Impostazioni globali in tempo reale; i valori predefiniti finché il DB non risponde. */
export function useAppSettings(): AppSettings {
  return useLiveQuery(() => settingsRepo.getAll(), [], DEFAULT_SETTINGS);
}
