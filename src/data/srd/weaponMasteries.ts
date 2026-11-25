import type { MasteryKey } from '@/domain/items';
import { localizeRules, type RuleEntry, type RuleTextEn } from './types';

/**
 * Maestrie nelle armi (regole 2024).
 * Nomi italiani provvisori: da confrontare con il Manuale del Giocatore 2024 in italiano
 * (il nome inglese è sempre mostrato accanto nell'Inspector).
 */
const WEAPON_MASTERIES_IT: Record<MasteryKey, RuleEntry<MasteryKey>> = {
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

const WEAPON_MASTERIES_EN: Record<MasteryKey, RuleTextEn> = {
  cleave: {
    summary: 'On a melee hit, attack a second adjacent creature.',
    body: `If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a **second creature** within 5 feet of the first that is also within your reach.

On a hit, the second creature takes the weapon's damage, but don't add your ability modifier to that damage unless it's negative.

You can make this extra attack **only once per turn**.`,
  },
  graze: {
    summary: 'On a miss, you still deal damage equal to your modifier.',
    body: `If your attack roll with this weapon misses a creature, you can deal damage to it equal to the **ability modifier** you used for the attack roll. The damage is of the weapon's type and can be increased only by increasing the modifier.`,
  },
  nick: {
    summary: "The Light weapon's extra attack is part of the Attack action.",
    body: `When you make the extra attack of the [Light](prop:light) property, you can make it as part of the **Attack action** instead of as a Bonus Action.

You can make this extra attack only once per turn.`,
  },
  push: {
    summary: 'On a hit, push the creature 10 feet.',
    body: `If you hit a creature with this weapon, you can push it up to **10 feet** straight away from yourself if it is Large or smaller.`,
  },
  sap: {
    summary: 'On a hit, the creature has disadvantage on its next attack.',
    body: `If you hit a creature with this weapon, that creature has **disadvantage** on its next attack roll before the start of your next turn.`,
  },
  slow: {
    summary: "On a hit that deals damage, −10 feet to the target's speed.",
    body: `If you hit a creature with this weapon and deal damage to it, you can reduce its speed by **10 feet** until the start of your next turn.

If the creature is hit more than once by weapons with this property, the reduction doesn't exceed 10 feet.`,
  },
  topple: {
    summary: 'On a hit, the target makes a Constitution save or falls Prone.',
    body: `If you hit a creature with this weapon, you can force it to make a **Constitution saving throw** (DC 8 + the ability modifier used to make the attack roll + your Proficiency Bonus). On a failed save, the creature has the [Prone](cond:prone) condition.`,
  },
  vex: {
    summary: 'On a hit that deals damage, you have advantage on your next attack against it.',
    body: `If you hit a creature with this weapon and deal damage to it, you have **advantage** on your next attack roll against that creature before the end of your next turn.`,
  },
};

export const WEAPON_MASTERIES: Record<MasteryKey, RuleEntry<MasteryKey>> = localizeRules(
  WEAPON_MASTERIES_IT,
  WEAPON_MASTERIES_EN,
);
