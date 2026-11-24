/** Un passo della visita guidata: evidenzia l'elemento con `data-tour="<target>"`, se visibile. */
export interface TourStep {
  /** Valore dell'attributo `data-tour` da evidenziare; assente = scheda al centro dello schermo. */
  target?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Benvenuto in Codex',
    body: 'Una visita veloce per vedere dove sta ogni cosa: scheda, grimorio, inventario e wiki della campagna, tutto in un posto solo. Puoi saltarla quando vuoi e rivederla dalle Impostazioni.',
  },
  {
    target: 'characters',
    title: 'I tuoi personaggi',
    body: 'Qui scegli il personaggio attivo e ne crei di nuovi. Puoi averne quanti vuoi: le sezioni sotto mostrano sempre quello selezionato.',
  },
  {
    target: 'nav',
    title: 'Le sezioni',
    body: 'Scheda (caratteristiche, abilità, attacchi, privilegi), Grimorio (incantesimi e slot), Campagna Wiki (luoghi, NPC, fazioni, diario delle sessioni) e Inventario (monete, equipaggiamento, contenitori). Si attivano quando hai un personaggio.',
  },
  {
    target: 'vitals',
    title: 'Sempre sott’occhio',
    body: 'Qui compaiono punti ferita, Classe Armatura, slot incantesimo, risorse e concentrazione del personaggio, con i pulsanti per danni, cure e riposi. Restano visibili in ogni pagina, così al tavolo non devi cercarli.',
  },
  {
    target: 'search',
    title: 'Cerca tutto con Ctrl+K',
    body: 'Trova voci della wiki, incantesimi, regole, privilegi e oggetti. Con > hai i comandi rapidi (es. Riposo Lungo), con @ solo le voci della campagna, con # i tag.',
  },
  {
    target: 'inspector',
    title: 'Il pannello dei dettagli',
    body: 'Cliccando un incantesimo, una condizione, un’arma o un [[collegamento]] della wiki, i dettagli si aprono nel pannello a destra senza farti cambiare pagina. Con ◀ ▶ torni alle voci viste prima.',
  },
  {
    target: 'save',
    title: 'Salvataggio automatico',
    body: 'Ogni modifica si salva da sola, nel tuo browser: nessun account e funziona anche offline. Ogni tanto esporta un backup dalle Impostazioni, così non perdi nulla.',
  },
  {
    target: 'compendium',
    title: 'Compendio delle regole',
    body: 'Condizioni, proprietà e maestrie delle armi, specie, background, talenti, armi e armature: le regole SRD sempre a un clic.',
  },
  {
    target: 'settings',
    title: 'Impostazioni e contenuti',
    body: 'Backup, unità di misura, tema. Da qui importi anche incantesimi, specie, oggetti e talenti dai file di 5etools, o il pacchetto di contenuti che ti passa il tuo gruppo.',
  },
  {
    target: 'start',
    title: 'Si comincia!',
    body: 'Crea il tuo primo personaggio con la creazione guidata (specie e background si applicano da soli), importa un file ricevuto da qualcuno, oppure carica l’esempio per esplorare l’app.',
  },
];
