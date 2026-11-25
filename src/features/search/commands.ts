import type { Character } from '@/domain/character';
import type { ID } from '@/domain/primitives';
import { LOCALE, m, setLocale } from '@/i18n';
import { normalizeKey } from '@/lib/normalizeKey';

export interface Command {
  id: string;
  label: string;
  /** Parole aggiuntive per trovarlo. */
  keywords?: string;
  run: () => void;
}

export interface CommandContext {
  navigate: (to: string) => void;
  active: Character | undefined;
  campaignId: ID | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  openRest: (kind: 'short' | 'long') => void;
  createWikiEntry: () => void;
  exportBackup: () => void;
}

const C = m.search.commands;
/** Etichetta e parole chiave di un comando, dal dizionario della lingua attiva. */
const text = ([label, keywords]: string[]) => ({ label: label!, keywords });

/** Comandi della palette (prefisso `>`), solo quelli sensati nello stato attuale. */
export function buildCommands(ctx: CommandContext): Command[] {
  const pg = ctx.active ? `/pg/${ctx.active.id}` : null;
  const list: Array<Command | false> = [
    !!pg && { id: 'go-sheet', ...text(C.goSheet), run: () => ctx.navigate(`${pg}/scheda`) },
    !!pg && { id: 'go-grimoire', ...text(C.goGrimoire), run: () => ctx.navigate(`${pg}/grimorio`) },
    !!pg && { id: 'go-inventory', ...text(C.goInventory), run: () => ctx.navigate(`${pg}/inventario`) },
    { id: 'go-wiki', ...text(C.goWiki), run: () => ctx.navigate(`/campagna/${ctx.campaignId ?? ''}`) },
    { id: 'go-compendium', ...text(C.goCompendium), run: () => ctx.navigate('/compendio') },
    { id: 'go-settings', ...text(C.goSettings), run: () => ctx.navigate('/impostazioni') },
    !!ctx.active && { id: 'rest-short', ...text(C.restShort), run: () => ctx.openRest('short') },
    !!ctx.active && { id: 'rest-long', ...text(C.restLong), run: () => ctx.openRest('long') },
    !!ctx.campaignId && { id: 'new-entry', ...text(C.newEntry), run: ctx.createWikiEntry },
    { id: 'new-character', ...text(C.newCharacter), run: () => ctx.navigate('/benvenuto') },
    {
      id: 'theme',
      label: ctx.theme === 'dark' ? C.lightTheme : C.darkTheme,
      keywords: C.themeKeywords,
      run: ctx.toggleTheme,
    },
    { id: 'export-backup', ...text(C.exportBackup), run: ctx.exportBackup },
    { id: 'language', ...text(C.language), run: () => setLocale(LOCALE === 'it' ? 'en' : 'it') },
  ];
  return list.filter((c): c is Command => !!c);
}

export function filterCommands(commands: Command[], text: string): Command[] {
  const q = normalizeKey(text);
  if (!q) return commands;
  return commands.filter((c) => normalizeKey(`${c.label} ${c.keywords ?? ''}`).includes(q));
}
