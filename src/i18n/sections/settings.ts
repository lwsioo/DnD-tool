import { pick } from '../locale';

const it = {
  backupDownloaded: (name: string) => `Backup scaricato: ${name}`,
  packDownloaded: (name: string) => `Pacchetto scaricato: ${name}`,
  backup: {
    title: 'Backup e trasferimento',
    intro:
      'I dati restano solo in questo browser. Esporta un backup completo ogni tanto, o per spostarli su un altro dispositivo.',
    last: (when: string) => `Ultimo backup completo: ${when}`,
    never: 'mai',
    export: 'Esporta backup completo',
    import: 'Importa file…',
    preReplace: (when: string) => `Copia dell’archivio salvata prima dell’ultima sostituzione (${when}).`,
    restore: 'Ripristina',
    restoreTitle: 'Ripristinare l’archivio precedente?',
    restoreBody:
      'L’archivio torna com’era prima dell’ultima sostituzione. Lo stato attuale viene a sua volta salvato, così puoi cambiare idea.',
    restored: 'Archivio ripristinato.',
  },
  language: {
    title: 'Lingua',
    intro: 'Lingua dell’interfaccia e delle regole SRD integrate. Cambiandola, l’app si ricarica.',
    note: 'I contenuti che hai già creato o importato (personaggi, note, incantesimi importati) restano come sono.',
  },
  units: {
    title: 'Unità di misura',
    metric: 'Metri e kg (manuali italiani)',
    imperial: 'Piedi e libbre',
  },
  appearance: {
    title: 'Aspetto',
    theme: 'Tema',
    dark: 'Scuro',
    light: 'Chiaro',
    tourHint: 'La visita guidata mostra a cosa serve ogni parte dell’app.',
    tour: 'Rivedi la visita guidata',
  },
  storage: {
    title: 'Archivio del browser',
    persisted: 'Archivio persistente: il browser non lo cancellerà per liberare spazio.',
    unsupported: 'Questo browser non permette di rendere persistente l’archivio: fai backup regolari.',
    bestEffort: 'Archivio non ancora persistente: in caso di poco spazio il browser potrebbe cancellarlo.',
    denied: 'Il browser non ha concesso la persistenza: fai backup regolari.',
    persist: 'Rendi persistente',
  },
  example: {
    title: 'Dati di esempio',
    intro: 'Il personaggio e la campagna dimostrativi sono ancora nell’archivio.',
    remove: 'Rimuovi dati di esempio',
    confirmTitle: 'Rimuovere i dati di esempio?',
    confirm: 'Rimuovi',
    body:
      'Vengono eliminati il personaggio di esempio, la sua campagna con le voci e gli incantesimi di esempio non usati da altri personaggi. L’operazione non si può annullare.',
    removed: 'Dati di esempio rimossi.',
  },
  content: {
    title: 'Contenuti',
    intro:
      'Importa in una volta sola più file di 5etools (incantesimi, specie, background, talenti, oggetti) o un pacchetto di Codex. Per dare a qualcuno tutti i tuoi contenuti pronti, esporta il pacchetto: chi lo importa li ritrova nel wizard, nella scheda, nel grimorio e nell’inventario. Specie, background e talenti SRD sono già inclusi nell’app.',
    counts: (c: { spells: number; species: number; background: number; feat: number; item: number }) =>
      `${c.spells} incantesimi · ${c.species} specie · ${c.background} background · ${c.feat} talenti · ${c.item} oggetti`,
    inLibrary: (summary: string) => `In libreria: ${summary} (oltre ai contenuti SRD integrati).`,
    import: 'Importa contenuti…',
    export: 'Esporta pacchetto contenuti',
    shareNote: 'Condividi solo materiale SRD, tuo, o di manuali che anche gli altri possiedono.',
  },
  rules: {
    title: (name: string) => `Regole di ${name || 'questo personaggio'}`,
    encumbrance: 'Ingombro',
    encumbranceRule: 'Regola di ingombro',
    off: 'Non considerare',
    standard: 'Capacità di carico (FOR × 15)',
    variant: 'Variante: Ingombrato / Pesantemente ingombrato',
    inspiration: 'Ispirazione Eroica a ogni Riposo Lungo (Umano: Intraprendente)',
    clearTemp: 'Azzera i PF temporanei con il Riposo Lungo',
  },
};

const en: typeof it = {
  backupDownloaded: (name: string) => `Backup downloaded: ${name}`,
  packDownloaded: (name: string) => `Pack downloaded: ${name}`,
  backup: {
    title: 'Backup and transfer',
    intro:
      'Your data stays only in this browser. Export a full backup now and then, or to move it to another device.',
    last: (when: string) => `Last full backup: ${when}`,
    never: 'never',
    export: 'Export full backup',
    import: 'Import file…',
    preReplace: (when: string) => `Copy of the archive saved before the last replacement (${when}).`,
    restore: 'Restore',
    restoreTitle: 'Restore the previous archive?',
    restoreBody:
      'The archive goes back to how it was before the last replacement. The current state is saved too, so you can change your mind.',
    restored: 'Archive restored.',
  },
  language: {
    title: 'Language',
    intro: 'Language of the interface and of the built-in SRD rules. Changing it reloads the app.',
    note: "Content you've already created or imported (characters, notes, imported spells) stays as it is.",
  },
  units: {
    title: 'Units',
    metric: 'Meters and kg',
    imperial: 'Feet and pounds (rulebooks)',
  },
  appearance: {
    title: 'Appearance',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    tourHint: 'The guided tour shows what each part of the app is for.',
    tour: 'Replay the guided tour',
  },
  storage: {
    title: 'Browser storage',
    persisted: "Persistent storage: the browser won't delete it to free up space.",
    unsupported: "This browser can't make the storage persistent: back up regularly.",
    bestEffort: 'Storage not persistent yet: if space runs low, the browser might delete it.',
    denied: "The browser didn't grant persistence: back up regularly.",
    persist: 'Make persistent',
  },
  example: {
    title: 'Example data',
    intro: 'The demo character and campaign are still in your archive.',
    remove: 'Remove example data',
    confirmTitle: 'Remove the example data?',
    confirm: 'Remove',
    body:
      "This deletes the example character, its campaign with its entries, and the example spells not used by other characters. This can't be undone.",
    removed: 'Example data removed.',
  },
  content: {
    title: 'Content',
    intro:
      'Import several 5etools files at once (spells, species, backgrounds, feats, items) or a Codex pack. To give someone all your content ready to use, export the pack: whoever imports it finds everything in the wizard, the sheet, the spellbook and the inventory. SRD species, backgrounds and feats are already built in.',
    counts: (c: { spells: number; species: number; background: number; feat: number; item: number }) =>
      `${c.spells} spells · ${c.species} species · ${c.background} backgrounds · ${c.feat} feats · ${c.item} items`,
    inLibrary: (summary: string) => `In the library: ${summary} (plus the built-in SRD content).`,
    import: 'Import content…',
    export: 'Export content pack',
    shareNote: 'Only share SRD material, your own, or content from books the others own too.',
  },
  rules: {
    title: (name: string) => `${name || 'This character'}'s rules`,
    encumbrance: 'Encumbrance',
    encumbranceRule: 'Encumbrance rule',
    off: 'Ignore',
    standard: 'Carrying capacity (STR × 15)',
    variant: 'Variant: Encumbered / Heavily encumbered',
    inspiration: 'Heroic Inspiration on every Long Rest (Human: Resourceful)',
    clearTemp: 'Clear temporary HP on a Long Rest',
  },
};

export const settings = pick(it, en);
