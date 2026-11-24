import type { MasteryKey } from '@/domain/items';
import type { RuleEntry } from './types';

/**
 * Maestrie nelle armi (regole 2024).
 * Nomi italiani provvisori: da confrontare con il Manuale del Giocatore 2024 in italiano
 * (il nome inglese è sempre mostrato accanto nell'Inspector).
 */
export const WEAPON_MASTERIES: Record<MasteryKey, RuleEntry<MasteryKey>> = {
  cleave: {
    key: 'cleave',
    name: 'Fendere',
    nameEn: 'Cleave',
    summary: 'Colpendo in mischia, attacchi una seconda creatura adiacente.',
    body: `Se colpisci una creatura con un attacco in mischia con quest'arma, puoi effettuare un altro attacco in mischia con la stessa arma contro una **seconda creatura** entro 1,5 m (5 ft) dalla prima e a tua portata.

Se colpisci, la seconda creatura subisce i danni dell'arma, ma senza aggiungere il modificatore di caratteristica (a meno che non sia negativo).

Puoi effettuare questo attacco extra **una sola volta per turno**.`,
  },
  graze: {
    key: 'graze',
    name: 'Graffiare',
    nameEn: 'Graze',
    summary: 'Se manchi, infliggi comunque danni pari al modificatore.',
    body: `Se il tuo tiro per colpire con quest'arma manca una creatura, puoi comunque infliggerle danni pari al **modificatore di caratteristica** usato per il tiro. I danni sono dello stesso tipo dell'arma e possono aumentare solo aumentando il modificatore.`,
  },
  nick: {
    key: 'nick',
    name: 'Intaccare',
    nameEn: 'Nick',
    summary: 'L’attacco extra dell’arma Leggera fa parte dell’azione di Attacco.',
    body: `Quando effettui l'attacco extra concesso dalla proprietà [Leggera](prop:light), puoi farlo come parte dell'**azione di Attacco** invece che come azione bonus.

Puoi farlo una sola volta per turno.`,
  },
  push: {
    key: 'push',
    name: 'Spingere',
    nameEn: 'Push',
    summary: 'Colpendo, spingi la creatura di 3 m.',
    body: `Se colpisci una creatura con quest'arma, puoi spingerla fino a **3 m (10 ft)** in linea retta lontano da te, se è di taglia Grande o inferiore.`,
  },
  sap: {
    key: 'sap',
    name: 'Fiaccare',
    nameEn: 'Sap',
    summary: 'Colpendo, la creatura ha svantaggio al suo prossimo attacco.',
    body: `Se colpisci una creatura con quest'arma, ha **svantaggio** al suo prossimo tiro per colpire effettuato prima dell'inizio del tuo prossimo turno.`,
  },
  slow: {
    key: 'slow',
    name: 'Rallentare',
    nameEn: 'Slow',
    summary: 'Colpendo e infliggendo danni, −3 m alla velocità del bersaglio.',
    body: `Se colpisci una creatura con quest'arma e le infliggi danni, puoi ridurne la velocità di **3 m (10 ft)** fino all'inizio del tuo prossimo turno.

Se la creatura viene colpita più volte da armi con questa maestria, la riduzione non supera comunque i 3 m.`,
  },
  topple: {
    key: 'topple',
    name: 'Rovesciare',
    nameEn: 'Topple',
    summary: 'Colpendo, il bersaglio fa un TS su Costituzione o cade Prono.',
    body: `Se colpisci una creatura con quest'arma, puoi costringerla a effettuare un **tiro salvezza su Costituzione** (CD 8 + il modificatore di caratteristica usato per il tiro per colpire + il tuo bonus di competenza). Se fallisce, cade [Prona](cond:prone).`,
  },
  vex: {
    key: 'vex',
    name: 'Tormentare',
    nameEn: 'Vex',
    summary: 'Colpendo e infliggendo danni, hai vantaggio al prossimo attacco contro di essa.',
    body: `Se colpisci una creatura con quest'arma e le infliggi danni, hai **vantaggio** al tuo prossimo tiro per colpire contro quella creatura prima della fine del tuo prossimo turno.`,
  },
};
