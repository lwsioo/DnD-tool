import type { WeaponPropertyKey } from '@/domain/items';
import type { RuleEntry } from './types';

export const WEAPON_PROPERTIES: Record<WeaponPropertyKey, RuleEntry<WeaponPropertyKey>> = {
  ammunition: {
    key: 'ammunition',
    name: 'Munizioni',
    nameEn: 'Ammunition',
    summary: 'Serve una munizione per ogni attacco a distanza.',
    body: `Puoi effettuare un attacco a distanza con quest'arma solo se hai una munizione adatta; ogni attacco ne consuma una. Il tipo di munizione è indicato accanto alla gittata.

Prendere la munizione fa parte dell'attacco (con un'arma a una mano ti serve una mano libera per caricarla).

Dopo il combattimento puoi spendere 1 minuto per recuperare metà delle munizioni usate, arrotondando per difetto.`,
  },
  finesse: {
    key: 'finesse',
    name: 'Accurata',
    nameEn: 'Finesse',
    summary: 'Usa Forza o Destrezza, a scelta, per colpire e per i danni.',
    body: `Quando attacchi con un'arma Accurata scegli se usare il modificatore di **Forza** o di **Destrezza** per il tiro per colpire e per i danni.

Devi usare la stessa caratteristica per entrambi i tiri.`,
  },
  heavy: {
    key: 'heavy',
    name: 'Pesante',
    nameEn: 'Heavy',
    summary: 'Svantaggio a colpire se la caratteristica richiesta è sotto 13.',
    body: `Hai **svantaggio** ai tiri per colpire con un'arma Pesante se è un'arma da mischia e la tua Forza è inferiore a 13, oppure se è un'arma a distanza e la tua Destrezza è inferiore a 13.`,
  },
  light: {
    key: 'light',
    name: 'Leggera',
    nameEn: 'Light',
    summary: 'Permette un attacco extra con un’altra arma Leggera.',
    body: `Quando effettui l'azione di Attacco con un'arma Leggera, puoi effettuare un attacco extra come **azione bonus** con un'altra arma Leggera diversa, impugnata nell'altra mano.

A quell'attacco extra non aggiungi il modificatore di caratteristica ai danni, a meno che non sia negativo.

La maestria [Intaccare](mastery:nick) permette di effettuarlo come parte dell'azione di Attacco.`,
  },
  loading: {
    key: 'loading',
    name: 'Ricarica',
    nameEn: 'Loading',
    summary: 'Un solo colpo per azione, azione bonus o reazione.',
    body: `Con un'arma con Ricarica puoi sparare un solo colpo quando usi un'azione, un'azione bonus o una reazione, indipendentemente dal numero di attacchi che potresti normalmente effettuare.`,
  },
  range: {
    key: 'range',
    name: 'Gittata',
    nameEn: 'Range',
    summary: 'Gittata normale e lunga: oltre la normale si attacca con svantaggio.',
    body: `La gittata è indicata con due numeri: la **gittata normale** e la **gittata lunga**.

Attaccare un bersaglio oltre la gittata normale impone **svantaggio** al tiro per colpire; non puoi attaccare un bersaglio oltre la gittata lunga.`,
  },
  reach: {
    key: 'reach',
    name: 'Portata',
    nameEn: 'Reach',
    summary: '+1,5 m (5 ft) alla portata degli attacchi in mischia.',
    body: `Un'arma con Portata aggiunge **1,5 metri (5 ft)** alla tua portata quando attacchi con essa, anche per gli attacchi di opportunità.`,
  },
  thrown: {
    key: 'thrown',
    name: 'Lancio',
    nameEn: 'Thrown',
    summary: 'Si può lanciare per un attacco a distanza.',
    body: `Puoi lanciare un'arma con Lancio per effettuare un attacco a distanza e puoi estrarla come parte dell'attacco.

Se è un'arma da mischia, per il tiro per colpire e per i danni usi la stessa caratteristica che useresti in mischia (Forza, oppure Destrezza se è [Accurata](prop:finesse)).`,
  },
  twoHanded: {
    key: 'twoHanded',
    name: 'A Due Mani',
    nameEn: 'Two-Handed',
    summary: 'Richiede due mani per attaccare.',
    body: `Per attaccare con quest'arma devi impugnarla con **entrambe le mani**.`,
  },
  versatile: {
    key: 'versatile',
    name: 'Versatile',
    nameEn: 'Versatile',
    summary: 'A una o a due mani: a due mani usa il dado maggiore.',
    body: `Puoi impugnare quest'arma con una o con due mani. Il dado di danno indicato tra parentesi si usa quando attacchi **a due mani**.`,
  },
};
