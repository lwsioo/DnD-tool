import type { BackgroundDef, FeatDef, OriginTrait, SpeciesDef, SpeciesOption } from '@/domain/origins';
import type { DamageType } from '@/domain/primitives';

/**
 * Specie, background e talenti d'origine del System Reference Document 5.2 (CC-BY-4.0),
 * riassunti in italiano. I nomi italiani dei talenti sono provvisori (nome inglese accanto).
 * Gli effetti meccanici automatizzabili (scurovisione, vantaggi, bonus) sono espressi come effetti;
 * il resto è nel testo del privilegio.
 */

const longRest = (max: string) => ({ max, recharge: { shortRest: 0, longRest: 'all' as const } });
const shortOrLong = (max: string) => ({
  max,
  recharge: { shortRest: 'all' as const, longRest: 'all' as const },
});

const darkvision = (m: number): OriginTrait => ({
  name: `Scurovisione (${m} m)`,
  description: `Vedi nella luce fioca entro ${m} metri come se fosse luce intensa, e nell'oscurità come se fosse luce fioca (in sfumature di grigio).`,
});

const lineageSpells = (cantrip: string, lvl3: string, lvl5: string, extra = '') =>
  `${extra}Conosci il trucchetto **${cantrip}**. Al 3° livello impari **${lvl3}** e al 5° **${lvl5}**: li lanci ciascuno una volta per Riposo Lungo senza slot (e anche con gli slot che hai). Scegli Intelligenza, Saggezza o Carisma come caratteristica da incantatore per questi incantesimi.`;

// ── Specie ──────────────────────────────────────────────────────────────────────────────

const DRAGONS: Array<[string, string, DamageType, string]> = [
  ['black', 'Nero', 'acid', 'acido'],
  ['blue', 'Blu', 'lightning', 'fulmine'],
  ['brass', 'Ottone', 'fire', 'fuoco'],
  ['bronze', 'Bronzo', 'lightning', 'fulmine'],
  ['copper', 'Rame', 'acid', 'acido'],
  ['gold', 'Oro', 'fire', 'fuoco'],
  ['green', 'Verde', 'poison', 'veleno'],
  ['red', 'Rosso', 'fire', 'fuoco'],
  ['silver', 'Argento', 'cold', 'freddo'],
  ['white', 'Bianco', 'cold', 'freddo'],
];

const dragonOptions: SpeciesOption[] = DRAGONS.map(([key, name, , label]) => ({
  key,
  name: `Drago ${name} (${label})`,
  traits: [
    {
      name: `Resistenza Draconica (${label})`,
      description: `Hai resistenza ai danni da ${label}. Il tuo Soffio infligge danni da ${label}.`,
    },
  ],
}));

const GIANTS: Array<[string, string, string, string]> = [
  [
    'cloud',
    'Nube',
    'Balzo della Nube',
    'Con un’azione bonus ti teletrasporti magicamente in uno spazio libero che vedi entro 9 metri.',
  ],
  [
    'fire',
    'Fuoco',
    'Ustione del Fuoco',
    'Quando colpisci un bersaglio con un tiro per colpire, puoi infliggergli 1d10 danni da fuoco extra.',
  ],
  [
    'frost',
    'Gelo',
    'Gelo del Ghiaccio',
    'Quando colpisci un bersaglio con un tiro per colpire, puoi infliggergli 1d6 danni da freddo extra e ridurne la velocità di 3 metri fino all’inizio del tuo prossimo turno.',
  ],
  [
    'hill',
    'Collina',
    'Ruzzolone della Collina',
    'Quando colpisci una creatura Grande o più piccola con un tiro per colpire, puoi farla cadere Prona.',
  ],
  [
    'stone',
    'Pietra',
    'Resistenza della Pietra',
    'Quando subisci danni, con una reazione tiri 1d12, aggiungi il modificatore di Costituzione e riduci i danni di quel totale.',
  ],
  [
    'storm',
    'Tempesta',
    'Tuono della Tempesta',
    'Quando una creatura entro 18 metri ti infligge danni, con una reazione le infliggi 1d8 danni da tuono.',
  ],
];

export const SRD_SPECIES: SpeciesDef[] = [
  {
    id: 'srd-dragonborn',
    name: 'Dragonide',
    nameEn: 'Dragonborn',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['M'],
    speed: 30,
    darkvision: 60,
    traits: [
      darkvision(18),
      {
        name: 'Soffio',
        description:
          'Quando effettui l’azione di Attacco, puoi sostituire un attacco con un’esalazione di energia magica in un cono di 4,5 m o una linea di 9 m (larga 1,5 m). Le creature nell’area fanno un TS su Destrezza (CD 8 + mod. Costituzione + bonus di competenza): 1d10 danni del tuo tipo se falliscono, la metà se riescono. I danni salgono a 2d10 al 5° livello, 3d10 all’11° e 4d10 al 17°.',
        uses: longRest('pb'),
      },
      {
        name: 'Volo Draconico',
        description:
          'Dal 5° livello, con un’azione bonus fai spuntare ali spettrali per 10 minuti: hai una velocità di volare pari alla tua velocità. Una volta per Riposo Lungo.',
        uses: longRest('1'),
        minLevel: 5,
      },
    ],
    choice: { label: 'Antenato draconico', options: dragonOptions },
    description: 'Discendenti dei draghi, con soffio e resistenza legati al proprio antenato.',
  },
  {
    id: 'srd-dwarf',
    name: 'Nano',
    nameEn: 'Dwarf',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['M'],
    speed: 30,
    darkvision: 120,
    traits: [
      darkvision(36),
      {
        name: 'Resilienza Nanica',
        description:
          'Hai resistenza ai danni da veleno e vantaggio ai tiri salvezza per evitare o terminare la condizione Avvelenato.',
      },
      {
        name: 'Robustezza Nanica',
        description: 'I tuoi punti ferita massimi aumentano di 1, e di 1 ogni volta che sali di livello.',
        effects: [{ target: 'hp.max', op: 'add', value: 'lvl' }],
      },
      {
        name: 'Esperto di Pietre',
        description:
          'Con un’azione bonus ottieni percezione tellurica entro 18 metri per 10 minuti, purché tu e ciò che percepisci siate a contatto con la pietra.',
        uses: longRest('pb'),
      },
    ],
  },
  {
    id: 'srd-elf',
    name: 'Elfo',
    nameEn: 'Elf',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['M'],
    speed: 30,
    darkvision: 60,
    traits: [
      darkvision(18),
      {
        name: 'Ascendenza Fatata',
        description: 'Hai vantaggio ai tiri salvezza per evitare o terminare la condizione Affascinato.',
      },
      {
        name: 'Trance',
        description:
          'Non hai bisogno di dormire e la magia non può addormentarti. Puoi completare un Riposo Lungo in 4 ore di meditazione.',
      },
      {
        name: 'Sensi Acuti',
        description: 'Hai competenza in Intuizione, Percezione o Sopravvivenza (a scelta).',
      },
    ],
    skillChoice: { count: 1, from: ['insight', 'perception', 'survival'] },
    choice: {
      label: 'Lignaggio elfico',
      options: [
        {
          key: 'drow',
          name: 'Drow',
          grantsSpells: true,
          traits: [
            {
              name: 'Lignaggio Drow',
              description: lineageSpells(
                'Luci Danzanti',
                'Luminescenza',
                'Oscurità',
                'La tua scurovisione arriva a 36 metri. ',
              ),
            },
          ],
        },
        {
          key: 'high',
          name: 'Alto Elfo',
          grantsSpells: true,
          traits: [
            {
              name: 'Lignaggio dell’Alto Elfo',
              description: lineageSpells(
                'Prestidigitazione',
                'Individuazione del Magico',
                'Passo Velato',
                'Dopo un Riposo Lungo puoi sostituire il trucchetto con un altro della lista del Mago. ',
              ),
            },
          ],
        },
        {
          key: 'wood',
          name: 'Elfo dei Boschi',
          speed: 35,
          grantsSpells: true,
          traits: [
            {
              name: 'Lignaggio dell’Elfo dei Boschi',
              description: lineageSpells(
                'Arte Druidica',
                'Passo Veloce',
                'Passare senza Tracce',
                'La tua velocità sale a 10,5 metri. ',
              ),
            },
          ],
        },
      ],
    },
  },
  {
    id: 'srd-gnome',
    name: 'Gnomo',
    nameEn: 'Gnome',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['S'],
    speed: 30,
    darkvision: 60,
    traits: [
      darkvision(18),
      {
        name: 'Astuzia Gnomesca',
        description: 'Hai vantaggio ai tiri salvezza su Intelligenza, Saggezza e Carisma.',
        effects: [
          { target: 'save.int', op: 'advantage' },
          { target: 'save.wis', op: 'advantage' },
          { target: 'save.cha', op: 'advantage' },
        ],
      },
    ],
    choice: {
      label: 'Lignaggio gnomesco',
      options: [
        {
          key: 'forest',
          name: 'Gnomo delle Foreste',
          grantsSpells: true,
          traits: [
            {
              name: 'Lignaggio dello Gnomo delle Foreste',
              description:
                'Conosci il trucchetto **Illusione Minore** e hai sempre preparato **Parlare con gli Animali**, che puoi lanciare senza slot un numero di volte pari al bonus di competenza per Riposo Lungo.',
              uses: longRest('pb'),
            },
          ],
        },
        {
          key: 'rock',
          name: 'Gnomo delle Rocce',
          grantsSpells: true,
          traits: [
            {
              name: 'Lignaggio dello Gnomo delle Rocce',
              description:
                'Conosci i trucchetti **Aggiustare** e **Prestidigitazione**. Con 10 minuti di lavoro puoi creare un minuscolo congegno a orologeria (CA 5, 1 PF) che riproduce un effetto di Prestidigitazione; ne puoi avere tre alla volta.',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'srd-goliath',
    name: 'Goliath',
    nameEn: 'Goliath',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['M'],
    speed: 35,
    traits: [
      {
        name: 'Forma Grande',
        description:
          'Dal 5° livello, con un’azione bonus diventi Grande per 10 minuti: hai vantaggio alle prove di Forza e la tua velocità aumenta di 3 metri. Una volta per Riposo Lungo.',
        uses: longRest('1'),
        minLevel: 5,
        toggleable: true,
        effects: [
          { target: 'check.str', op: 'advantage' },
          { target: 'speed', op: 'add', value: '10' },
        ],
      },
      {
        name: 'Corporatura Possente',
        description:
          'Hai vantaggio alle prove per terminare la condizione Afferrato e, per la capacità di carico, conti come una taglia più grande.',
      },
    ],
    choice: {
      label: 'Antenato gigante',
      options: GIANTS.map(([key, giant, name, text]) => ({
        key,
        name: `Gigante del ${giant}`,
        traits: [
          {
            name,
            description: `${text} Puoi usarlo un numero di volte pari al bonus di competenza per Riposo Lungo.`,
            uses: longRest('pb'),
          },
        ],
      })),
    },
  },
  {
    id: 'srd-halfling',
    name: 'Halfling',
    nameEn: 'Halfling',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['S'],
    speed: 30,
    traits: [
      {
        name: 'Coraggioso',
        description: 'Hai vantaggio ai tiri salvezza per evitare o terminare la condizione Spaventato.',
      },
      {
        name: 'Agilità Halfling',
        description:
          'Puoi muoverti attraverso lo spazio di una creatura di taglia più grande della tua, ma non fermarti lì.',
      },
      {
        name: 'Fortunato',
        description:
          'Quando ottieni 1 sul d20 di un tiro d20, puoi ripetere il tiro e devi usare il nuovo risultato.',
      },
      {
        name: 'Furtivo per Natura',
        description:
          'Puoi effettuare l’azione Nascondersi anche quando sei oscurato solo da una creatura almeno di una taglia più grande.',
      },
    ],
  },
  {
    id: 'srd-human',
    name: 'Umano',
    nameEn: 'Human',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['S', 'M'],
    speed: 30,
    traits: [
      {
        name: 'Intraprendente',
        description: 'Ottieni Ispirazione Eroica ogni volta che completi un Riposo Lungo.',
      },
      { name: 'Abile', description: 'Ottieni competenza in un’abilità a tua scelta.' },
      { name: 'Versatile', description: 'Ottieni un talento d’origine a tua scelta.' },
    ],
    skillChoice: { count: 1 },
    originFeat: true,
    heroicInspiration: true,
  },
  {
    id: 'srd-orc',
    name: 'Orco',
    nameEn: 'Orc',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['M'],
    speed: 30,
    darkvision: 120,
    traits: [
      darkvision(36),
      {
        name: 'Scarica di Adrenalina',
        description:
          'Con un’azione bonus effettui l’azione Scatto e ottieni punti ferita temporanei pari al bonus di competenza.',
        uses: shortOrLong('pb'),
      },
      {
        name: 'Tenacia Implacabile',
        description:
          'Quando scendi a 0 punti ferita senza morire sul colpo, puoi invece restare a 1 punto ferita. Una volta per Riposo Lungo.',
        uses: longRest('1'),
      },
    ],
  },
  {
    id: 'srd-tiefling',
    name: 'Tiefling',
    nameEn: 'Tiefling',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    sizes: ['S', 'M'],
    speed: 30,
    darkvision: 60,
    traits: [
      darkvision(18),
      {
        name: 'Presenza Ultraterrena',
        description:
          'Conosci il trucchetto **Taumaturgia**, che usa la stessa caratteristica del tuo Retaggio Immondo.',
      },
    ],
    choice: {
      label: 'Retaggio immondo',
      options: [
        {
          key: 'abyssal',
          name: 'Abissale',
          grantsSpells: true,
          traits: [
            {
              name: 'Retaggio Abissale',
              description: `Hai resistenza ai danni da veleno. ${lineageSpells('Spruzzo Velenoso', 'Raggio di Malattia', 'Blocca Persone')}`,
            },
          ],
        },
        {
          key: 'chthonic',
          name: 'Ctonio',
          grantsSpells: true,
          traits: [
            {
              name: 'Retaggio Ctonio',
              description: `Hai resistenza ai danni necrotici. ${lineageSpells('Tocco Gelido', 'Vita Falsata', 'Raggio di Indebolimento')}`,
            },
          ],
        },
        {
          key: 'infernal',
          name: 'Infernale',
          grantsSpells: true,
          traits: [
            {
              name: 'Retaggio Infernale',
              description: `Hai resistenza ai danni da fuoco. ${lineageSpells('Fiotto di Fuoco', 'Intimorire Infernale', 'Oscurità')}`,
            },
          ],
        },
      ],
    },
  },
];

// ── Talenti d'origine ───────────────────────────────────────────────────────────────────

export const SRD_FEATS: FeatDef[] = [
  {
    id: 'srd-feat-alert',
    name: 'Allerta',
    nameEn: 'Alert',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    category: 'origin',
    description:
      '**Competenza nell’Iniziativa.** Aggiungi il bonus di competenza all’iniziativa.\n\n**Scambio di Iniziativa.** Subito dopo aver tirato l’iniziativa puoi scambiare la tua con quella di un alleato consenziente, purché nessuno dei due sia Incapacitato.',
    effects: [{ target: 'initiative', op: 'add', value: 'pb' }],
  },
  {
    id: 'srd-feat-magic-initiate',
    name: 'Iniziato alla Magia',
    nameEn: 'Magic Initiate',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    category: 'origin',
    description:
      'Scegli una lista tra Chierico, Druido e Mago. Impari **due trucchetti** e **un incantesimo di 1° livello** di quella lista; il secondo lo lanci una volta per Riposo Lungo senza slot (e anche con gli slot che hai). Scegli Intelligenza, Saggezza o Carisma come caratteristica da incantatore. Puoi prendere questo talento più volte, con liste diverse.',
    spellLists: ['Chierico', 'Druido', 'Mago'],
    repeatable: true,
  },
  {
    id: 'srd-feat-savage-attacker',
    name: 'Attaccante Selvaggio',
    nameEn: 'Savage Attacker',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    category: 'origin',
    description:
      'Una volta per turno, quando colpisci un bersaglio con un’arma, puoi tirare due volte i dadi di danno dell’arma e usare il risultato che preferisci.',
  },
  {
    id: 'srd-feat-skilled',
    name: 'Competente',
    nameEn: 'Skilled',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    category: 'origin',
    description:
      'Ottieni competenza in una combinazione di tre abilità o strumenti a tua scelta. Puoi prendere questo talento più volte.',
    skillChoices: 3,
    repeatable: true,
  },
];

// ── Background ──────────────────────────────────────────────────────────────────────────

export const SRD_BACKGROUNDS: BackgroundDef[] = [
  {
    id: 'srd-bg-acolyte',
    name: 'Accolito',
    nameEn: 'Acolyte',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    abilities: ['int', 'wis', 'cha'],
    featId: 'srd-feat-magic-initiate',
    featName: 'Iniziato alla Magia (Chierico)',
    skills: ['insight', 'religion'],
    tools: ['Strumenti da calligrafo'],
    equipment: [
      { name: 'Strumenti da calligrafo', quantity: 1, weightLb: 5 },
      { name: 'Libro di preghiere', quantity: 1, weightLb: 5 },
      { name: 'Simbolo sacro', quantity: 1, weightLb: 1 },
      { name: 'Pergamena (foglio)', quantity: 10 },
      { name: 'Veste', quantity: 1, weightLb: 4 },
    ],
    equipmentGoldInA: 8,
    equipmentGold: 50,
    description: 'Hai servito in un tempio, tra riti, preghiere e testi sacri.',
  },
  {
    id: 'srd-bg-criminal',
    name: 'Criminale',
    nameEn: 'Criminal',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    abilities: ['dex', 'con', 'int'],
    featId: 'srd-feat-alert',
    skills: ['sleightOfHand', 'stealth'],
    tools: ['Strumenti da scasso'],
    equipment: [
      { name: 'Pugnale', quantity: 2, weaponId: 'dagger' },
      { name: 'Strumenti da scasso', quantity: 1, weightLb: 1 },
      { name: 'Piede di porco', quantity: 1, weightLb: 5 },
      { name: 'Borsa', quantity: 2, weightLb: 1 },
      { name: 'Abiti da viaggiatore', quantity: 1, weightLb: 4 },
    ],
    equipmentGoldInA: 16,
    equipmentGold: 50,
    description: 'Hai vissuto di espedienti nei vicoli, tra borseggi, scassi e contatti loschi.',
  },
  {
    id: 'srd-bg-sage',
    name: 'Saggio',
    nameEn: 'Sage',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    abilities: ['con', 'int', 'wis'],
    featId: 'srd-feat-magic-initiate',
    featName: 'Iniziato alla Magia (Mago)',
    skills: ['arcana', 'history'],
    tools: ['Strumenti da calligrafo'],
    equipment: [
      { name: 'Bastone Ferrato', quantity: 1, weaponId: 'quarterstaff' },
      { name: 'Strumenti da calligrafo', quantity: 1, weightLb: 5 },
      { name: 'Libro di storia', quantity: 1, weightLb: 5 },
      { name: 'Pergamena (foglio)', quantity: 8 },
      { name: 'Veste', quantity: 1, weightLb: 4 },
    ],
    equipmentGoldInA: 8,
    equipmentGold: 50,
    description: 'Hai passato gli anni formativi tra biblioteche e maestri, a studiare la storia e l’arcano.',
  },
  {
    id: 'srd-bg-soldier',
    name: 'Soldato',
    nameEn: 'Soldier',
    origin: 'srd',
    sourceBook: 'SRD 5.2',
    abilities: ['str', 'dex', 'con'],
    featId: 'srd-feat-savage-attacker',
    skills: ['athletics', 'intimidation'],
    tools: ['Set da gioco'],
    equipment: [
      { name: 'Lancia', quantity: 1, weaponId: 'spear' },
      { name: 'Arco Corto', quantity: 1, weaponId: 'shortbow' },
      { name: 'Frecce', quantity: 20, weightLb: 0.05 },
      { name: 'Set da gioco', quantity: 1 },
      { name: 'Kit del guaritore', quantity: 1, weightLb: 3 },
      { name: 'Faretra', quantity: 1, weightLb: 1 },
      { name: 'Abiti da viaggiatore', quantity: 1, weightLb: 4 },
    ],
    equipmentGoldInA: 14,
    equipmentGold: 50,
    description: 'Ti sei addestrato in un esercito o in una milizia, imparando disciplina e tattica.',
  },
];
