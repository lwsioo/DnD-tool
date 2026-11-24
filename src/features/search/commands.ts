import type { Character } from '@/domain/character';
import type { ID } from '@/domain/primitives';
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

/** Comandi della palette (prefisso `>`), solo quelli sensati nello stato attuale. */
export function buildCommands(ctx: CommandContext): Command[] {
  const pg = ctx.active ? `/pg/${ctx.active.id}` : null;
  const list: Array<Command | false> = [
    !!pg && {
      id: 'go-sheet',
      label: 'Vai alla Scheda',
      keywords: 'personaggio',
      run: () => ctx.navigate(`${pg}/scheda`),
    },
    !!pg && {
      id: 'go-grimoire',
      label: 'Vai al Grimorio',
      keywords: 'incantesimi magia',
      run: () => ctx.navigate(`${pg}/grimorio`),
    },
    !!pg && {
      id: 'go-inventory',
      label: 'Vai all’Inventario',
      keywords: 'oggetti monete',
      run: () => ctx.navigate(`${pg}/inventario`),
    },
    {
      id: 'go-wiki',
      label: 'Vai alla Campagna Wiki',
      keywords: 'note',
      run: () => ctx.navigate(`/campagna/${ctx.campaignId ?? ''}`),
    },
    {
      id: 'go-compendium',
      label: 'Apri il Compendio',
      keywords: 'regole condizioni armi',
      run: () => ctx.navigate('/compendio'),
    },
    {
      id: 'go-settings',
      label: 'Apri le Impostazioni',
      keywords: 'backup unità',
      run: () => ctx.navigate('/impostazioni'),
    },
    !!ctx.active && {
      id: 'rest-short',
      label: 'Riposo Breve',
      keywords: 'dadi vita',
      run: () => ctx.openRest('short'),
    },
    !!ctx.active && {
      id: 'rest-long',
      label: 'Riposo Lungo',
      keywords: 'dormire',
      run: () => ctx.openRest('long'),
    },
    !!ctx.campaignId && {
      id: 'new-entry',
      label: 'Nuova voce wiki',
      keywords: 'npc luogo fazione sessione',
      run: ctx.createWikiEntry,
    },
    {
      id: 'new-character',
      label: 'Nuovo personaggio',
      keywords: 'crea importa esempio',
      run: () => ctx.navigate('/benvenuto'),
    },
    {
      id: 'theme',
      label: ctx.theme === 'dark' ? 'Tema chiaro' : 'Tema scuro',
      keywords: 'colori',
      run: ctx.toggleTheme,
    },
    { id: 'export-backup', label: 'Esporta backup completo', keywords: 'salva json', run: ctx.exportBackup },
  ];
  return list.filter((c): c is Command => !!c);
}

export function filterCommands(commands: Command[], text: string): Command[] {
  const q = normalizeKey(text);
  if (!q) return commands;
  return commands.filter((c) => normalizeKey(`${c.label} ${c.keywords ?? ''}`).includes(q));
}
