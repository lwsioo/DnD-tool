import type { WeaponPropertyKey } from '@/domain/items';
import { localizeRules, type RuleEntry, type RuleTextEn } from './types';

const WEAPON_PROPERTIES_IT: Record<WeaponPropertyKey, RuleEntry<WeaponPropertyKey>> = {
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

const WEAPON_PROPERTIES_EN: Record<WeaponPropertyKey, RuleTextEn> = {
  ammunition: {
    summary: 'Each ranged attack expends one piece of ammunition.',
    body: `You can make a ranged attack with this weapon only if you have the right ammunition, and each attack expends one piece. The ammunition type is listed next to the range.

Drawing the ammunition is part of the attack (you need a free hand to load a one-handed weapon).

After a fight, you can spend 1 minute to recover half the ammunition you used, rounding down.`,
  },
  finesse: {
    summary: 'Use your choice of Strength or Dexterity to hit and for damage.',
    body: `When you attack with a Finesse weapon, choose whether to use your **Strength** or **Dexterity** modifier for the attack and damage rolls.

You must use the same modifier for both rolls.`,
  },
  heavy: {
    summary: 'Disadvantage to hit if the required ability score is below 13.',
    body: `You have **disadvantage** on attack rolls with a Heavy weapon if it's a melee weapon and your Strength is lower than 13, or if it's a ranged weapon and your Dexterity is lower than 13.`,
  },
  light: {
    summary: 'Allows an extra attack with another Light weapon.',
    body: `When you take the Attack action and attack with a Light weapon, you can make one extra attack as a **Bonus Action** with a different Light weapon held in your other hand.

You don't add your ability modifier to the extra attack's damage unless that modifier is negative.

The [Nick](mastery:nick) mastery lets you make it as part of the Attack action.`,
  },
  loading: {
    summary: 'Only one shot per action, Bonus Action or Reaction.',
    body: `You can fire only one piece of ammunition from a Loading weapon when you use an action, a Bonus Action or a Reaction to fire it, regardless of the number of attacks you can normally make.`,
  },
  range: {
    summary: 'Normal and long range: beyond normal range you attack with disadvantage.',
    body: `Range is given as two numbers: the **normal range** and the **long range**.

Attacking a target beyond normal range imposes **disadvantage** on the attack roll; you can't attack a target beyond the long range.`,
  },
  reach: {
    summary: '+5 feet to the reach of your melee attacks.',
    body: `A Reach weapon adds **5 feet** to your reach when you attack with it, including opportunity attacks.`,
  },
  thrown: {
    summary: 'Can be thrown to make a ranged attack.',
    body: `You can throw a Thrown weapon to make a ranged attack, and you can draw it as part of the attack.

If it's a melee weapon, use the same ability modifier for the attack and damage rolls that you would use for a melee attack (Strength, or Dexterity if it's [Finesse](prop:finesse)).`,
  },
  twoHanded: {
    summary: 'Requires two hands to attack.',
    body: `You must hold this weapon with **both hands** to attack with it.`,
  },
  versatile: {
    summary: 'One or two hands: two-handed uses the larger die.',
    body: `You can wield this weapon with one or two hands. The damage die in parentheses is used when you attack **with two hands**.`,
  },
};

export const WEAPON_PROPERTIES: Record<WeaponPropertyKey, RuleEntry<WeaponPropertyKey>> = localizeRules(
  WEAPON_PROPERTIES_IT,
  WEAPON_PROPERTIES_EN,
);
