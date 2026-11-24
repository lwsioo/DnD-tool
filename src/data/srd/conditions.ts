import { ABILITIES } from '@/domain/abilities';
import type { Effect } from '@/domain/effects';
import type { RuleEntry } from './types';

export const CONDITION_KEYS = [
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
] as const;
export type ConditionKey = (typeof CONDITION_KEYS)[number];

export interface ConditionEntry extends RuleEntry<ConditionKey> {
  /**
   * Effetti che il motore applica automaticamente sul personaggio che ha la condizione.
   * Gli effetti "contro" di lui (es. attacchi con vantaggio contro un Prono) non riguardano la sua scheda.
   */
  effects: Effect[];
}

const fx = (key: string, list: Array<Omit<Effect, 'id'>>): Effect[] =>
  list.map((e, i) => ({ ...e, id: `cond:${key}:${i}` }));

const allChecks = (op: 'disadvantage' | 'advantage') =>
  ABILITIES.map((a) => ({ target: `check.${a}` as const, op }));

const speedZero = { target: 'speed', op: 'set', value: '0' } as const;
const initiativeDisadvantage = { target: 'initiative', op: 'disadvantage' } as const;

export const CONDITIONS: Record<ConditionKey, ConditionEntry> = {
  blinded: {
    key: 'blinded',
    name: 'Accecato',
    nameEn: 'Blinded',
    summary: 'Non vedi; i tuoi attacchi hanno svantaggio, quelli contro di te vantaggio.',
    body: `- **Non vedi:** fallisci automaticamente le prove che richiedono la vista.
- **Attacchi:** i tiri per colpire contro di te hanno vantaggio; i tuoi tiri per colpire hanno svantaggio.`,
    effects: fx('blinded', [{ target: 'attack.all', op: 'disadvantage' }]),
  },
  charmed: {
    key: 'charmed',
    name: 'Affascinato',
    nameEn: 'Charmed',
    summary: 'Non puoi attaccare chi ti ha affascinato; lui ha vantaggio nelle interazioni.',
    body: `- **Niente attacchi contro l'ammaliatore:** non puoi attaccarlo né bersagliarlo con capacità o effetti magici dannosi.
- **Vantaggio sociale:** l'ammaliatore ha vantaggio alle prove per interagire socialmente con te.`,
    effects: [],
  },
  deafened: {
    key: 'deafened',
    name: 'Assordato',
    nameEn: 'Deafened',
    summary: 'Non senti e fallisci le prove che richiedono l’udito.',
    body: `- **Non senti:** fallisci automaticamente le prove che richiedono l'udito.`,
    effects: [],
  },
  exhaustion: {
    key: 'exhaustion',
    name: 'Indebolimento',
    nameEn: 'Exhaustion',
    summary: 'Livelli cumulativi: −2 per livello ai tiri d20, −1,5 m di velocità per livello.',
    body: `L'Indebolimento è cumulativo, da 1 a 6 livelli. Si traccia con il contatore dedicato nella scheda, non come condizione semplice.

- **Tiri d20:** subisci −2 × il livello di Indebolimento.
- **Velocità:** si riduce di 1,5 m (5 ft) × il livello di Indebolimento.
- **Livello 6:** muori.
- **Recupero:** un Riposo Lungo completato riduce l'Indebolimento di 1 livello.`,
    effects: [],
  },
  frightened: {
    key: 'frightened',
    name: 'Spaventato',
    nameEn: 'Frightened',
    summary: 'Svantaggio a prove e attacchi mentre vedi la fonte della paura.',
    body: `- **Prove e attacchi:** hai svantaggio alle prove di caratteristica e ai tiri per colpire finché la fonte della paura è nel tuo campo visivo.
- **Non puoi avvicinarti:** non puoi muoverti volontariamente verso la fonte della paura.

_La scheda applica lo svantaggio finché la condizione è attiva: disattivala quando la fonte non è in vista._`,
    effects: fx('frightened', [...allChecks('disadvantage'), { target: 'attack.all', op: 'disadvantage' }]),
  },
  grappled: {
    key: 'grappled',
    name: 'Afferrato',
    nameEn: 'Grappled',
    summary: 'Velocità 0; svantaggio ad attaccare chiunque non sia chi ti afferra.',
    body: `- **Velocità 0:** la tua velocità è 0 e non può aumentare.
- **Attacchi:** hai svantaggio ai tiri per colpire contro qualsiasi bersaglio diverso da chi ti afferra.
- **Spostamento:** chi ti afferra può trascinarti con sé, spendendo movimento extra.`,
    effects: fx('grappled', [speedZero]),
  },
  incapacitated: {
    key: 'incapacitated',
    name: 'Incapacitato',
    nameEn: 'Incapacitated',
    summary: 'Niente azioni, azioni bonus o reazioni; la concentrazione si interrompe.',
    body: `- **Inattivo:** non puoi effettuare azioni, azioni bonus o reazioni.
- **Niente concentrazione:** la concentrazione si interrompe.
- **Senza parole:** non puoi parlare.
- **Sorpreso:** se sei Incapacitato quando tiri l'iniziativa, hai svantaggio al tiro.`,
    effects: fx('incapacitated', [initiativeDisadvantage]),
  },
  invisible: {
    key: 'invisible',
    name: 'Invisibile',
    nameEn: 'Invisible',
    summary: 'Vantaggio all’iniziativa e ai tuoi attacchi; svantaggio a chi ti attacca.',
    body: `- **Sorpresa:** se sei Invisibile quando tiri l'iniziativa, hai vantaggio al tiro.
- **Nascosto:** non sei influenzato da effetti che richiedono di vederti, a meno che chi li crea non possa vederti in qualche modo. L'equipaggiamento che indossi o trasporti è anch'esso nascosto.
- **Attacchi:** i tiri per colpire contro di te hanno svantaggio; i tuoi hanno vantaggio. Se una creatura riesce comunque a vederti, non hai questi benefici contro di essa.`,
    effects: fx('invisible', [
      { target: 'initiative', op: 'advantage' },
      { target: 'attack.all', op: 'advantage' },
    ]),
  },
  paralyzed: {
    key: 'paralyzed',
    name: 'Paralizzato',
    nameEn: 'Paralyzed',
    summary: 'Incapacitato, velocità 0, fallisce i TS su FOR e DES; colpi ravvicinati critici.',
    body: `- [Incapacitato](cond:incapacitated).
- **Velocità 0:** la tua velocità è 0 e non può aumentare.
- **TS:** fallisci automaticamente i tiri salvezza su Forza e Destrezza.
- **Attacchi:** i tiri per colpire contro di te hanno vantaggio.
- **Colpi automaticamente critici:** ogni colpo a segno contro di te è un critico se l'attaccante è entro 1,5 m (5 ft).`,
    effects: fx('paralyzed', [speedZero, initiativeDisadvantage]),
  },
  petrified: {
    key: 'petrified',
    name: 'Pietrificato',
    nameEn: 'Petrified',
    summary: 'Trasformato in sostanza inerte; incapacitato, resistenza a tutti i danni.',
    body: `- **Trasformato:** tu e gli oggetti non magici che indossi o trasporti diventate una sostanza solida e inanimata (di solito pietra). Il peso si moltiplica per dieci e smetti di invecchiare.
- [Incapacitato](cond:incapacitated).
- **Velocità 0:** la tua velocità è 0 e non può aumentare.
- **Attacchi:** i tiri per colpire contro di te hanno vantaggio.
- **TS:** fallisci automaticamente i tiri salvezza su Forza e Destrezza.
- **Resistenza:** hai resistenza a tutti i danni.
- **Immunità al veleno:** hai immunità alla condizione [Avvelenato](cond:poisoned).`,
    effects: fx('petrified', [speedZero, initiativeDisadvantage]),
  },
  poisoned: {
    key: 'poisoned',
    name: 'Avvelenato',
    nameEn: 'Poisoned',
    summary: 'Svantaggio ai tiri per colpire e alle prove di caratteristica.',
    body: `- **Prove e attacchi:** hai svantaggio ai tiri per colpire e alle prove di caratteristica.`,
    effects: fx('poisoned', [...allChecks('disadvantage'), { target: 'attack.all', op: 'disadvantage' }]),
  },
  prone: {
    key: 'prone',
    name: 'Prono',
    nameEn: 'Prone',
    summary: 'A terra: svantaggio ai tuoi attacchi; vantaggio a chi ti colpisce da vicino.',
    body: `- **Movimento ridotto:** puoi solo strisciare, oppure spendere metà della velocità (arrotondando per difetto) per rialzarti.
- **Attacchi:** hai svantaggio ai tiri per colpire. Un tiro per colpire contro di te ha vantaggio se l'attaccante è entro 1,5 m (5 ft), altrimenti ha svantaggio.`,
    effects: fx('prone', [{ target: 'attack.all', op: 'disadvantage' }]),
  },
  restrained: {
    key: 'restrained',
    name: 'Trattenuto',
    nameEn: 'Restrained',
    summary: 'Velocità 0; svantaggio ai tuoi attacchi e ai TS su Destrezza.',
    body: `- **Velocità 0:** la tua velocità è 0 e non può aumentare.
- **Attacchi:** i tiri per colpire contro di te hanno vantaggio; i tuoi hanno svantaggio.
- **TS:** hai svantaggio ai tiri salvezza su Destrezza.`,
    effects: fx('restrained', [
      speedZero,
      { target: 'attack.all', op: 'disadvantage' },
      { target: 'save.dex', op: 'disadvantage' },
    ]),
  },
  stunned: {
    key: 'stunned',
    name: 'Stordito',
    nameEn: 'Stunned',
    summary: 'Incapacitato, fallisce i TS su FOR e DES; chi ti attacca ha vantaggio.',
    body: `- [Incapacitato](cond:incapacitated).
- **TS:** fallisci automaticamente i tiri salvezza su Forza e Destrezza.
- **Attacchi:** i tiri per colpire contro di te hanno vantaggio.`,
    effects: fx('stunned', [initiativeDisadvantage]),
  },
  unconscious: {
    key: 'unconscious',
    name: 'Privo di Sensi',
    nameEn: 'Unconscious',
    summary: 'Incapacitato e Prono, lascia cadere ciò che tiene; colpi ravvicinati critici.',
    body: `- **Inerte:** sei [Incapacitato](cond:incapacitated) e [Prono](cond:prone) e lasci cadere ciò che tieni in mano. Quando la condizione termina resti Prono.
- **Velocità 0:** la tua velocità è 0 e non può aumentare.
- **Attacchi:** i tiri per colpire contro di te hanno vantaggio.
- **TS:** fallisci automaticamente i tiri salvezza su Forza e Destrezza.
- **Colpi automaticamente critici:** ogni colpo a segno contro di te è un critico se l'attaccante è entro 1,5 m (5 ft).
- **Inconsapevole:** non sei consapevole di ciò che ti circonda.`,
    effects: fx('unconscious', [
      speedZero,
      initiativeDisadvantage,
      { target: 'attack.all', op: 'disadvantage' },
    ]),
  },
};
