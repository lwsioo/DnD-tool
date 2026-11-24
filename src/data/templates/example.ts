import { produce } from 'immer';
import { ARMOR_BY_ID } from '@/data/srd/armor';
import { WEAPONS_BY_ID, weaponDataFromBase } from '@/data/srd/weapons';
import type { Character, Feature } from '@/domain/character';
import type { Effect } from '@/domain/effects';
import { createBlankCharacter, createCampaign, createWikiEntry } from '@/domain/factories';
import type { InventoryItem } from '@/domain/items';
import type { ID } from '@/domain/primitives';
import type { Spell } from '@/domain/spells';
import type { Campaign, WikiEntry } from '@/domain/wiki';
import { newId } from '@/lib/id';
import { normalizeKey } from '@/lib/normalizeKey';

export interface ExampleData {
  character: Character;
  campaign: Campaign;
  spells: Spell[];
  wikiEntries: WikiEntry[];
}

const effect = (e: Omit<Effect, 'id'>): Effect => ({ ...e, id: newId() });

function feature(f: Omit<Feature, 'id' | 'effects' | 'toggleable' | 'active'> & Partial<Feature>): Feature {
  return { id: newId(), effects: [], toggleable: false, active: true, ...f };
}

function item(i: Omit<InventoryItem, 'id' | 'effects' | 'parentId' | 'equipped'> & Partial<InventoryItem>) {
  return { id: newId(), effects: [], parentId: null, equipped: false, ...i } satisfies InventoryItem;
}

function weapon(baseId: string, quantity = 1): InventoryItem {
  const base = WEAPONS_BY_ID.get(baseId)!;
  return item({
    kind: 'weapon',
    name: base.name,
    quantity,
    weightLb: base.weightLb,
    valueCp: base.costCp,
    equipped: true,
    weapon: weaponDataFromBase(base),
  });
}

function spell(
  s: Omit<Spell, 'id' | 'nameKey' | 'createdAt' | 'updatedAt' | 'origin' | 'tags'>,
  now: number,
): Spell {
  return {
    ...s,
    id: newId(),
    nameKey: normalizeKey(s.name),
    origin: 'srd',
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Personaggio e mini-campagna dimostrativi: una Paladina umana di 3° livello
 * che mostra CA dinamica, Maestrie, risorse a ricarica, incantesimi e wikilink.
 * Ogni chiamata genera id nuovi.
 */
// prettier-ignore
export function buildExampleData(now = Date.now()): ExampleData {
  const spells = {
    bless: spell(
      {
        name: 'Benedizione',
        nameEn: 'Bless',
        sourceBook: 'SRD 5.2',
        level: 1,
        school: 'enchantment',
        castingTime: { amount: 1, unit: 'action' },
        ritual: false,
        range: { kind: 'distance', distance: 30 },
        components: { v: true, s: true, m: true, material: 'un simbolo sacro del valore di almeno 5 mo' },
        duration: { kind: 'timed', amount: 1, unit: 'minute', concentration: true },
        description:
          'Benedici fino a tre creature entro gittata. Ogni volta che un bersaglio effettua un tiro per colpire o un tiro salvezza prima della fine dell’incantesimo, aggiunge **1d4** al risultato.',
        higherLevels: 'Puoi bersagliare una creatura aggiuntiva per ogni livello di slot superiore al 1°.',
        classes: ['Chierico', 'Paladino'],
      },
      now,
    ),
    cure: spell(
      {
        name: 'Cura Ferite',
        nameEn: 'Cure Wounds',
        sourceBook: 'SRD 5.2',
        level: 1,
        school: 'abjuration',
        castingTime: { amount: 1, unit: 'action' },
        ritual: false,
        range: { kind: 'touch' },
        components: { v: true, s: true, m: false },
        duration: { kind: 'instant', concentration: false },
        description:
          'Una creatura che tocchi recupera un numero di punti ferita pari a **2d8** + il tuo modificatore da incantatore.',
        higherLevels: 'Le cure aumentano di 2d8 per ogni livello di slot superiore al 1°.',
        scaling: { perSlot: '2d8' },
        classes: ['Bardo', 'Chierico', 'Druido', 'Paladino', 'Ranger'],
      },
      now,
    ),
    smite: spell(
      {
        name: 'Punizione Divina',
        nameEn: 'Divine Smite',
        sourceBook: 'SRD 5.2',
        level: 1,
        school: 'evocation',
        castingTime: { amount: 1, unit: 'bonus', condition: 'subito dopo aver colpito con un’arma da mischia o un colpo senz’armi' },
        ritual: false,
        range: { kind: 'self' },
        components: { v: true, s: false, m: false },
        duration: { kind: 'instant', concentration: false },
        description:
          'Il bersaglio colpito subisce **2d8** danni radiosi extra, più 1d8 se è un Immondo o un Non Morto.',
        higherLevels: 'I danni aumentano di 1d8 per ogni livello di slot superiore al 1°.',
        scaling: { perSlot: '1d8' },
        classes: ['Paladino'],
        damageTypes: ['radiant'],
      },
      now,
    ),
    shieldOfFaith: spell(
      {
        name: 'Scudo della Fede',
        nameEn: 'Shield of Faith',
        sourceBook: 'SRD 5.2',
        level: 1,
        school: 'abjuration',
        castingTime: { amount: 1, unit: 'bonus' },
        ritual: false,
        range: { kind: 'distance', distance: 60 },
        components: { v: true, s: true, m: true, material: 'una pergamena di preghiera' },
        duration: { kind: 'timed', amount: 10, unit: 'minute', concentration: true },
        description: 'Un campo scintillante circonda una creatura a tua scelta entro gittata, che ottiene **+2 alla CA** per la durata.',
        classes: ['Chierico', 'Paladino'],
      },
      now,
    ),
    protection: spell(
      {
        name: 'Protezione dal Bene e dal Male',
        nameEn: 'Protection from Evil and Good',
        sourceBook: 'SRD 5.2',
        level: 1,
        school: 'abjuration',
        castingTime: { amount: 1, unit: 'action' },
        ritual: false,
        range: { kind: 'touch' },
        components: {
          v: true,
          s: true,
          m: true,
          material: 'una fiala di acqua santa del valore di almeno 25 mo, che l’incantesimo consuma',
          costGp: 25,
          consumed: true,
        },
        duration: { kind: 'timed', amount: 10, unit: 'minute', concentration: true },
        description: `Una creatura consenziente che tocchi è protetta da Aberrazioni, Celestiali, Elementali, Folletti, Immondi e Non Morti:

- quelle creature hanno svantaggio ai tiri per colpire contro di lei;
- non possono possederla;
- se ne è già [Affascinata](cond:charmed), [Spaventata](cond:frightened) o posseduta, ha vantaggio al nuovo tiro salvezza contro l’effetto.`,
        classes: ['Chierico', 'Paladino', 'Warlock', 'Mago'],
      },
      now,
    ),
  };

  const campaign = createCampaign('La Costa Spezzata', now);
  campaign.description = 'Mini-campagna di esempio per provare la wiki e i collegamenti.';

  const paladinId = newId();
  const sourceId = newId();
  const chainMail = ARMOR_BY_ID.get('chain-mail')!;
  const shield = ARMOR_BY_ID.get('shield')!;
  const backpack = item({
    kind: 'container',
    name: 'Zaino',
    quantity: 1,
    weightLb: 5,
    valueCp: 200,
    container: { capacityLb: 30, weightless: false, collapsed: false },
  });

  const character = produce(createBlankCharacter('Lyra Solmonte', now), (d) => {
    d.campaignId = campaign.id;
    d.identity = {
      name: 'Lyra Solmonte',
      species: 'Umana',
      size: 'M',
      background: 'Soldato',
      alignment: 'Legale Buona',
      deity: 'Aurelia, la Fiamma dell’Alba',
      xp: 900,
      appearance: 'Capelli ramati raccolti, cicatrice sul sopracciglio sinistro, mantello bianco consunto.',
    };
    d.classes = [
      { id: paladinId, classKey: 'paladin', name: 'Paladino', subclass: 'Giuramento di Devozione', level: 3, hitDie: 10, caster: 'half' },
    ];
    d.abilities = {
      str: { base: 15, bonus: 2 },
      dex: { base: 10, bonus: 0 },
      con: { base: 13, bonus: 1 },
      int: { base: 8, bonus: 0 },
      wis: { base: 12, bonus: 0 },
      cha: { base: 14, bonus: 0 },
    };
    d.saves.wis = 1;
    d.saves.cha = 1;
    for (const s of ['athletics', 'intimidation', 'perception', 'persuasion', 'religion'] as const) d.skills[s] = { prof: 1 };
    d.proficiencies = {
      armor: ['light', 'medium', 'heavy', 'shield'],
      weapons: ['simple', 'martial'],
      tools: ['Gioco: dadi', 'Veicoli (terrestri)'],
      languages: ['Comune', 'Nanico', 'Celestiale'],
    };
    d.weaponMasteries = ['longsword', 'javelin'];
    d.combat.hp = { current: 34, temp: 0, maxMode: 'auto' };
    d.combat.speed = { walk: 30 };
    d.combat.heroicInspiration = true;
    d.settings.heroicInspirationOnLongRest = true;

    d.features = [
      feature({
        category: 'class',
        name: 'Imposizione delle Mani',
        origin: 'Paladino 1',
        description:
          'Hai una riserva di punti di guarigione pari a 5 × il tuo livello da Paladino. Con un’azione bonus tocchi una creatura e le ridai punti ferita attingendo dalla riserva; spendendo 5 punti puoi invece rimuovere la condizione [Avvelenato](cond:poisoned).',
        uses: { max: '5 * lvl.paladin', used: 0, recharge: { shortRest: 0, longRest: 'all' }, pinned: true },
      }),
      feature({
        category: 'class',
        name: 'Stile di Combattimento: Difesa',
        origin: 'Paladino 2',
        description: 'Mentre indossi un’armatura leggera, media o pesante ottieni +1 alla CA.',
        effects: [effect({ target: 'ac', op: 'add', value: '1', requires: ['armorEquipped'] })],
      }),
      feature({
        category: 'class',
        name: 'Maestria nelle Armi',
        origin: 'Paladino 1',
        description:
          'Puoi usare le proprietà di maestria di due tipi di armi a scelta: qui Spada Lunga ([Fiaccare](mastery:sap)) e Giavellotto ([Rallentare](mastery:slow)). Puoi cambiarle a ogni Riposo Lungo.',
      }),
      feature({
        category: 'class',
        name: 'Incanalare Divinità',
        origin: 'Paladino 3',
        description:
          'Puoi incanalare energia divina per alimentare effetti come Senso Divino o le opzioni del tuo Giuramento. Recuperi un uso con un Riposo Breve e tutti con un Riposo Lungo.',
        uses: { max: '2', used: 0, recharge: { shortRest: 1, longRest: 'all' }, pinned: true },
      }),
      feature({
        category: 'subclass',
        name: 'Arma Sacra',
        origin: 'Giuramento di Devozione 3',
        description:
          'Con Incanalare Divinità impregni un’arma da mischia di energia positiva per 10 minuti: aggiungi il tuo modificatore di Carisma ai tiri per colpire con essa ed emette luce. **Attivala qui per vedere l’effetto sugli attacchi.**',
        toggleable: true,
        active: false,
        effects: [effect({ target: 'attack.melee', op: 'add', value: 'max(1, mod.cha)' })],
      }),
      feature({
        category: 'species',
        name: 'Intraprendente',
        origin: 'Umano',
        description: 'Ottieni Ispirazione Eroica ogni volta che completi un Riposo Lungo.',
      }),
      feature({
        category: 'species',
        name: 'Abile',
        origin: 'Umano',
        description: 'Ottieni competenza in un’abilità a tua scelta (qui: Percezione).',
      }),
      feature({
        category: 'feat',
        name: 'Robusto',
        origin: 'Talento d’Origine (Umano: Versatile)',
        description: 'I tuoi punti ferita massimi aumentano di 2 per ogni tuo livello.',
        effects: [effect({ target: 'hp.max', op: 'add', value: '2 * lvl' })],
      }),
      feature({
        category: 'feat',
        name: 'Attaccante Selvaggio',
        origin: 'Talento d’Origine (Soldato)',
        description:
          'Una volta per turno, quando colpisci con un’arma, puoi tirare due volte i dadi di danno dell’arma e usare il risultato che preferisci.',
      }),
    ];

    d.spellcasting.sources = [{ id: sourceId, label: 'Paladino', ability: 'cha', classEntryId: paladinId, preparedMax: '4' }];
    d.spellcasting.slots.used[0] = 1;
    d.spellcasting.spells = [
      { id: newId(), spellId: spells.bless.id, sourceId, status: 'prepared' },
      { id: newId(), spellId: spells.cure.id, sourceId, status: 'prepared' },
      { id: newId(), spellId: spells.smite.id, sourceId, status: 'prepared' },
      { id: newId(), spellId: spells.shieldOfFaith.id, sourceId, status: 'alwaysPrepared', notes: 'Incantesimo del Giuramento' },
      { id: newId(), spellId: spells.protection.id, sourceId, status: 'alwaysPrepared', notes: 'Incantesimo del Giuramento' },
    ];

    d.inventory.currency = { cp: 12, sp: 8, ep: 0, gp: 15, pp: 0 };
    d.inventory.items = [
      item({
        kind: 'armor',
        name: chainMail.name,
        quantity: 1,
        weightLb: chainMail.weightLb,
        valueCp: chainMail.costCp,
        equipped: true,
        armor: {
          category: 'heavy',
          baseAc: chainMail.baseAc,
          dexCap: 0,
          strRequirement: chainMail.strRequirement,
          stealthDisadvantage: true,
          magicBonus: 0,
        },
      }),
      item({ kind: 'shield', name: shield.name, quantity: 1, weightLb: shield.weightLb, valueCp: shield.costCp, equipped: true, shield: { acBonus: 2 } }),
      weapon('longsword'),
      weapon('javelin', 4),
      item({ kind: 'focus', name: 'Simbolo Sacro (amuleto)', quantity: 1, weightLb: 1, valueCp: 500, equipped: true, description: 'Il sole nascente di Aurelia, in argento.' }),
      item({ kind: 'consumable', name: 'Pozione di Guarigione', quantity: 2, weightLb: 0.5, valueCp: 5000, description: 'Recuperi 2d4 + 2 punti ferita bevendola.' }),
      backpack,
      item({ kind: 'gear', name: 'Corda di canapa (15 m)', quantity: 1, weightLb: 10, valueCp: 100, parentId: backpack.id }),
      item({ kind: 'consumable', name: 'Razioni (1 giorno)', quantity: 5, weightLb: 2, valueCp: 50, parentId: backpack.id }),
      item({ kind: 'gear', name: 'Otre', quantity: 1, weightLb: 5, valueCp: 20, parentId: backpack.id }),
      item({ kind: 'gear', name: 'Torcia', quantity: 5, weightLb: 1, valueCp: 1, parentId: backpack.id }),
    ];

    d.notes = `Lyra ha giurato di proteggere la [[Costa Spezzata]] dopo il naufragio della sua compagnia.

- Devota ad [[Aurelia]].
- Deve un favore a [[Mirella Corvonero]] della [[Gilda dei Cartografi]].`;
  });

  // ── Wiki della campagna ──
  const port = createWikiEntry(campaign.id, 'location', 'Porto Salmastro', { region: 'Costa Spezzata', locationType: 'Città portuale' }, now);
  const guild = createWikiEntry(campaign.id, 'faction', 'Gilda dei Cartografi', { goals: 'Mappare le rotte sicure tra gli scogli della costa.' }, now);
  const mirella = createWikiEntry(campaign.id, 'npc', 'Mirella Corvonero', { status: 'alive', attitude: 'friendly', role: 'Maestra cartografa', species: 'Mezzelfa' }, now);
  const aurelia = createWikiEntry(campaign.id, 'religion', 'Aurelia', { deity: 'Aurelia, la Fiamma dell’Alba', domains: ['Luce', 'Vita'], symbol: 'Sole nascente', alignment: 'Neutrale Buona' }, now);
  const session = createWikiEntry(campaign.id, 'session', 'Arrivo a Porto Salmastro', { number: 1, date: new Date(now).toISOString().slice(0, 10), inGameDate: '3 di Germinale', participantIds: [character.id] }, now);

  const wikiEntries: WikiEntry[] = [
    {
      ...port,
      aliases: ['Salmastro'],
      aliasKeys: ['salmastro'],
      meta: { ...port.meta, factionIds: [guild.id] },
      body: `Città portuale arroccata sugli scogli, sede della [[Gilda dei Cartografi]].

Il tempio di [[Aurelia]] domina il porto: i marinai vi lasciano un lume prima di salpare.`,
    },
    {
      ...guild,
      meta: { ...guild.meta, leaderIds: [mirella.id], headquartersId: port.id, religionId: aurelia.id },
      body: 'Custodi delle carte nautiche della costa. Pagano bene chi recupera mappe perdute, come quella della [[Torre di Vel]].',
    },
    {
      ...mirella,
      meta: { ...mirella.meta, factionIds: [guild.id], locationId: port.id },
      body: `Guida la [[Gilda dei Cartografi]] da [[Porto Salmastro|Salmastro]].

> «Una mappa sbagliata uccide più di una spada.»

Sa più di quanto dice sulla [[Torre di Vel]].`,
    },
    {
      ...aurelia,
      body: 'Divinità dell’alba e delle seconde occasioni. I suoi paladini giurano di non abbandonare mai chi chiede aiuto.',
    },
    {
      ...session,
      body: `Il gruppo sbarca a [[Porto Salmastro]] dopo il naufragio.

- Incontro con [[Mirella Corvonero]], che offre 50 mo per una mappa perduta.
- Indizio: la mappa sarebbe nella [[Torre di Vel]].`,
    },
  ];

  return { character, campaign, spells: Object.values(spells), wikiEntries };
}

/** Id generati, per poterli rimuovere in blocco. */
export function exampleIds(data: ExampleData): { characterId: ID; campaignId: ID; spellIds: ID[] } {
  return {
    characterId: data.character.id,
    campaignId: data.campaign.id,
    spellIds: data.spells.map((s) => s.id),
  };
}
