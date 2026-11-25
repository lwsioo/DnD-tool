/**
 * Lingua dell'interfaccia (italiano o inglese).
 *
 * La lingua è fissata all'avvio della pagina: cambiarla salva la scelta e ricarica l'app. Così anche i dati
 * costruiti al caricamento (regole SRD, tabelle, indici di ricerca) sono già nella lingua giusta, senza dover
 * rendere «reattivo» ogni modulo.
 */
export type Locale = 'it' | 'en';

export const LOCALES: Array<{ id: Locale; label: string }> = [
  { id: 'it', label: 'Italiano' },
  { id: 'en', label: 'English' },
];

const STORAGE_KEY = 'codex-locale';
const isLocale = (v: unknown): v is Locale => v === 'it' || v === 'en';

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Ordine di scelta: `?lang=` nell'indirizzo (lo usa l'app desktop) → scelta salvata → lingua del browser.
 * I test girano in italiano, a meno che non abbiano salvato un'altra lingua.
 */
export function detectLocale(): Locale {
  if (typeof location !== 'undefined') {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (isLocale(fromUrl)) {
      try {
        localStorage.setItem(STORAGE_KEY, fromUrl);
        // Tolto dall'indirizzo, così un ricaricamento non sovrascrive una scelta fatta dopo nell'app.
        const url = new URL(location.href);
        url.searchParams.delete('lang');
        history.replaceState(history.state, '', url);
      } catch {
        /* archivio non disponibile: vale solo per questa pagina */
      }
      return fromUrl;
    }
  }
  const stored = readStored();
  if (isLocale(stored)) return stored;
  if (import.meta.env.MODE === 'test') return 'it';
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return nav.toLowerCase().startsWith('it') ? 'it' : 'en';
}

export const LOCALE: Locale = detectLocale();
if (typeof document !== 'undefined') document.documentElement.lang = LOCALE;
/** Tag BCP 47 per numeri e date (Intl). */
export const LANG_TAG = LOCALE === 'it' ? 'it-IT' : 'en-US';

/** Ponte con l'app desktop (Electron), se presente: ricorda la lingua anche per il menù iniziale. */
interface DesktopBridge {
  setLocale?: (l: Locale) => void;
}

/** Cambia lingua: salva la scelta e ricarica l'app (restando sulla stessa pagina). */
export function setLocale(locale: Locale): void {
  if (locale === LOCALE) return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignora */
  }
  (globalThis as { codexDesktop?: DesktopBridge }).codexDesktop?.setLocale?.(locale);
  location.reload();
}

/** Sceglie il valore della lingua attiva. */
export const pick = <T>(it: T, en: T): T => (LOCALE === 'en' ? en : it);
