import { pick } from '@/i18n';

/** Un passo della visita guidata: evidenzia l'elemento con `data-tour="<target>"`, se visibile. */
export interface TourStep {
  /** Valore dell'attributo `data-tour` da evidenziare; assente = scheda al centro dello schermo. */
  target?: string;
  title: string;
  body: string;
}

const IT: TourStep[] = [
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
    body: 'Backup, lingua, unità di misura, tema. Da qui importi anche incantesimi, specie, oggetti e talenti dai file di 5etools, o il pacchetto di contenuti che ti passa il tuo gruppo.',
  },
  {
    target: 'start',
    title: 'Si comincia!',
    body: 'Crea il tuo primo personaggio con la creazione guidata (specie e background si applicano da soli), importa un file ricevuto da qualcuno, oppure carica l’esempio per esplorare l’app.',
  },
];

const EN: TourStep[] = [
  {
    title: 'Welcome to Codex',
    body: 'A quick tour to see where everything is: character sheet, spellbook, inventory and campaign wiki, all in one place. You can skip it anytime and replay it from Settings.',
  },
  {
    target: 'characters',
    title: 'Your characters',
    body: 'Pick the active character and create new ones here. You can have as many as you like: the sections below always show the selected one.',
  },
  {
    target: 'nav',
    title: 'The sections',
    body: 'Sheet (abilities, skills, attacks, features), Spellbook (spells and slots), Campaign Wiki (places, NPCs, factions, session log) and Inventory (coins, equipment, containers). They unlock once you have a character.',
  },
  {
    target: 'vitals',
    title: 'Always in view',
    body: "Hit points, Armor Class, spell slots, resources and concentration show up here, with buttons for damage, healing and rests. They stay visible on every page, so you don't have to hunt for them at the table.",
  },
  {
    target: 'search',
    title: 'Search everything with Ctrl+K',
    body: 'Find wiki entries, spells, rules, features and items. Type > for quick commands (e.g. Long Rest), @ for campaign entries only, # for tags.',
  },
  {
    target: 'inspector',
    title: 'The details panel',
    body: 'Click a spell, a condition, a weapon or a wiki [[link]] and its details open in the right panel without leaving the page. Use ◀ ▶ to go back to what you viewed before.',
  },
  {
    target: 'save',
    title: 'Autosave',
    body: 'Every change saves itself, in your browser: no account needed, and it works offline too. Export a backup from Settings now and then so you never lose anything.',
  },
  {
    target: 'compendium',
    title: 'Rules compendium',
    body: 'Conditions, weapon properties and masteries, species, backgrounds, feats, weapons and armor: the SRD rules always one click away.',
  },
  {
    target: 'settings',
    title: 'Settings and content',
    body: 'Backup, language, units, theme. From here you can also import spells, species, items and feats from 5etools files, or the content pack your group shares with you.',
  },
  {
    target: 'start',
    title: "Let's begin!",
    body: 'Create your first character with the guided creation (species and background apply themselves), import a file someone sent you, or load the example to explore the app.',
  },
];

export const TOUR_STEPS: TourStep[] = pick(IT, EN);
