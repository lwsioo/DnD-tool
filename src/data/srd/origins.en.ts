/**
 * Testi inglesi di specie, background e talenti d'origine SRD 5.2 (riassunti).
 * Si sovrappongono ai dati di origins.ts nello stesso ordine: la parte meccanica (usi, effetti, livelli)
 * resta definita una volta sola lì.
 */

export interface TraitEn {
  name: string;
  description: string;
}

interface SpeciesEn {
  description?: string;
  /** Stesso ordine dei tratti italiani. */
  traits: TraitEn[];
  choiceLabel?: string;
  options?: Record<string, { name: string; traits: TraitEn[] }>;
}

const darkvision = (ft: number): TraitEn => ({
  name: `Darkvision (${ft} ft)`,
  description: `You can see in Dim Light within ${ft} feet as if it were Bright Light, and in Darkness as if it were Dim Light (in shades of gray).`,
});

const lineageSpells = (cantrip: string, lvl3: string, lvl5: string, extra = '') =>
  `${extra}You know the **${cantrip}** cantrip. At level 3 you learn **${lvl3}** and at level 5 **${lvl5}**: you can cast each once per Long Rest without a spell slot (and with any slots you have). Choose Intelligence, Wisdom or Charisma as your spellcasting ability for these spells.`;

const dragon = (color: string, type: string) => ({
  name: `${color} Dragon (${type})`,
  traits: [
    {
      name: `Draconic Resistance (${type})`,
      description: `You have resistance to ${type} damage. Your Breath Weapon deals ${type} damage.`,
    },
  ],
});

const giant = (giantName: string, trait: string, text: string) => ({
  name: `${giantName} Giant`,
  traits: [
    {
      name: trait,
      description: `${text} You can use it a number of times equal to your Proficiency Bonus per Long Rest.`,
    },
  ],
});

export const SPECIES_EN: Record<string, SpeciesEn> = {
  'srd-dragonborn': {
    description:
      'Descendants of dragons, with a breath weapon and resistance tied to their draconic ancestor.',
    traits: [
      darkvision(60),
      {
        name: 'Breath Weapon',
        description:
          'When you take the Attack action, you can replace one attack with an exhalation of magical energy in a 15-foot Cone or a 30-foot Line (5 feet wide). Creatures in the area make a Dexterity saving throw (DC 8 + Constitution modifier + Proficiency Bonus): 1d10 damage of your type on a failure, half on a success. The damage increases to 2d10 at level 5, 3d10 at level 11 and 4d10 at level 17.',
      },
      {
        name: 'Draconic Flight',
        description:
          'Starting at level 5, as a Bonus Action you sprout spectral wings for 10 minutes, gaining a Fly Speed equal to your Speed. Once per Long Rest.',
      },
    ],
    choiceLabel: 'Draconic ancestry',
    options: {
      black: dragon('Black', 'acid'),
      blue: dragon('Blue', 'lightning'),
      brass: dragon('Brass', 'fire'),
      bronze: dragon('Bronze', 'lightning'),
      copper: dragon('Copper', 'acid'),
      gold: dragon('Gold', 'fire'),
      green: dragon('Green', 'poison'),
      red: dragon('Red', 'fire'),
      silver: dragon('Silver', 'cold'),
      white: dragon('White', 'cold'),
    },
  },
  'srd-dwarf': {
    traits: [
      darkvision(120),
      {
        name: 'Dwarven Resilience',
        description:
          'You have resistance to poison damage and advantage on saving throws to avoid or end the Poisoned condition.',
      },
      {
        name: 'Dwarven Toughness',
        description:
          'Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.',
      },
      {
        name: 'Stonecunning',
        description:
          'As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes, as long as you and what you sense are in contact with stone.',
      },
    ],
  },
  'srd-elf': {
    traits: [
      darkvision(60),
      {
        name: 'Fey Ancestry',
        description: 'You have advantage on saving throws to avoid or end the Charmed condition.',
      },
      {
        name: 'Trance',
        description:
          "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours of meditation.",
      },
      {
        name: 'Keen Senses',
        description: 'You have proficiency in your choice of Insight, Perception or Survival.',
      },
    ],
    choiceLabel: 'Elven lineage',
    options: {
      drow: {
        name: 'Drow',
        traits: [
          {
            name: 'Drow Lineage',
            description: lineageSpells(
              'Dancing Lights',
              'Faerie Fire',
              'Darkness',
              'Your Darkvision has a range of 120 feet. ',
            ),
          },
        ],
      },
      high: {
        name: 'High Elf',
        traits: [
          {
            name: 'High Elf Lineage',
            description: lineageSpells(
              'Prestidigitation',
              'Detect Magic',
              'Misty Step',
              'Whenever you finish a Long Rest, you can replace that cantrip with another from the Wizard list. ',
            ),
          },
        ],
      },
      wood: {
        name: 'Wood Elf',
        traits: [
          {
            name: 'Wood Elf Lineage',
            description: lineageSpells(
              'Druidcraft',
              'Longstrider',
              'Pass without Trace',
              'Your Speed increases to 35 feet. ',
            ),
          },
        ],
      },
    },
  },
  'srd-gnome': {
    traits: [
      darkvision(60),
      {
        name: 'Gnomish Cunning',
        description: 'You have advantage on Intelligence, Wisdom and Charisma saving throws.',
      },
    ],
    choiceLabel: 'Gnomish lineage',
    options: {
      forest: {
        name: 'Forest Gnome',
        traits: [
          {
            name: 'Forest Gnome Lineage',
            description:
              'You know the **Minor Illusion** cantrip and always have **Speak with Animals** prepared; you can cast it without a spell slot a number of times equal to your Proficiency Bonus per Long Rest.',
          },
        ],
      },
      rock: {
        name: 'Rock Gnome',
        traits: [
          {
            name: 'Rock Gnome Lineage',
            description:
              'You know the **Mending** and **Prestidigitation** cantrips. With 10 minutes of work you can build a Tiny clockwork device (AC 5, 1 HP) that produces a Prestidigitation effect; you can have up to three at a time.',
          },
        ],
      },
    },
  },
  'srd-goliath': {
    traits: [
      {
        name: 'Large Form',
        description:
          'Starting at level 5, as a Bonus Action you become Large for 10 minutes: you have advantage on Strength checks and your Speed increases by 10 feet. Once per Long Rest.',
      },
      {
        name: 'Powerful Build',
        description:
          'You have advantage on any ability check to end the Grappled condition, and you count as one size larger when determining your carrying capacity.',
      },
    ],
    choiceLabel: 'Giant ancestry',
    options: {
      cloud: giant(
        'Cloud',
        "Cloud's Jaunt",
        'As a Bonus Action, you magically teleport to an unoccupied space you can see within 30 feet.',
      ),
      fire: giant(
        'Fire',
        "Fire's Burn",
        'When you hit a target with an attack roll, you can deal an extra 1d10 fire damage to it.',
      ),
      frost: giant(
        'Frost',
        "Frost's Chill",
        'When you hit a target with an attack roll, you can deal an extra 1d6 cold damage to it and reduce its Speed by 10 feet until the start of your next turn.',
      ),
      hill: giant(
        'Hill',
        "Hill's Tumble",
        'When you hit a Large or smaller creature with an attack roll, you can give it the Prone condition.',
      ),
      stone: giant(
        'Stone',
        "Stone's Endurance",
        'When you take damage, you can take a Reaction to roll 1d12, add your Constitution modifier and reduce the damage by that total.',
      ),
      storm: giant(
        'Storm',
        "Storm's Thunder",
        'When a creature within 60 feet deals damage to you, you can take a Reaction to deal 1d8 thunder damage to it.',
      ),
    },
  },
  'srd-halfling': {
    traits: [
      {
        name: 'Brave',
        description: 'You have advantage on saving throws to avoid or end the Frightened condition.',
      },
      {
        name: 'Halfling Nimbleness',
        description:
          'You can move through the space of any creature that is a size larger than you, but you can’t stop there.',
      },
      {
        name: 'Luck',
        description:
          'When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.',
      },
      {
        name: 'Naturally Stealthy',
        description:
          'You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.',
      },
    ],
  },
  'srd-human': {
    traits: [
      { name: 'Resourceful', description: 'You gain Heroic Inspiration whenever you finish a Long Rest.' },
      { name: 'Skillful', description: 'You gain proficiency in one skill of your choice.' },
      { name: 'Versatile', description: 'You gain an Origin feat of your choice.' },
    ],
  },
  'srd-orc': {
    traits: [
      darkvision(120),
      {
        name: 'Adrenaline Rush',
        description:
          'As a Bonus Action, you take the Dash action and gain Temporary Hit Points equal to your Proficiency Bonus.',
      },
      {
        name: 'Relentless Endurance',
        description:
          "When you're reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once per Long Rest.",
      },
    ],
  },
  'srd-tiefling': {
    traits: [
      darkvision(60),
      {
        name: 'Otherworldly Presence',
        description:
          'You know the **Thaumaturgy** cantrip, which uses the same ability as your Fiendish Legacy.',
      },
    ],
    choiceLabel: 'Fiendish legacy',
    options: {
      abyssal: {
        name: 'Abyssal',
        traits: [
          {
            name: 'Abyssal Legacy',
            description: `You have resistance to poison damage. ${lineageSpells('Poison Spray', 'Ray of Sickness', 'Hold Person')}`,
          },
        ],
      },
      chthonic: {
        name: 'Chthonic',
        traits: [
          {
            name: 'Chthonic Legacy',
            description: `You have resistance to necrotic damage. ${lineageSpells('Chill Touch', 'False Life', 'Ray of Enfeeblement')}`,
          },
        ],
      },
      infernal: {
        name: 'Infernal',
        traits: [
          {
            name: 'Infernal Legacy',
            description: `You have resistance to fire damage. ${lineageSpells('Fire Bolt', 'Hellish Rebuke', 'Darkness')}`,
          },
        ],
      },
    },
  },
};

export const FEATS_EN: Record<string, { description: string; spellLists?: string[] }> = {
  'srd-feat-alert': {
    description:
      '**Initiative Proficiency.** Add your Proficiency Bonus to your Initiative.\n\n**Initiative Swap.** Immediately after you roll Initiative, you can swap your Initiative with that of one willing ally, as long as neither of you is Incapacitated.',
  },
  'srd-feat-magic-initiate': {
    description:
      'Choose the Cleric, Druid or Wizard spell list. You learn **two cantrips** and **one level 1 spell** from that list; you can cast the latter once per Long Rest without a spell slot (and with any slots you have). Choose Intelligence, Wisdom or Charisma as your spellcasting ability. You can take this feat more than once, choosing a different list each time.',
    spellLists: ['Cleric', 'Druid', 'Wizard'],
  },
  'srd-feat-savage-attacker': {
    description:
      "Once per turn, when you hit a target with a weapon, you can roll the weapon's damage dice twice and use either roll.",
  },
  'srd-feat-skilled': {
    description:
      'You gain proficiency in any combination of three skills or tools of your choice. You can take this feat more than once.',
  },
};

export const BACKGROUNDS_EN: Record<
  string,
  { featName?: string; tools: string[]; equipment: string[]; description: string }
> = {
  'srd-bg-acolyte': {
    featName: 'Magic Initiate (Cleric)',
    tools: ["Calligrapher's Supplies"],
    equipment: ["Calligrapher's Supplies", 'Book (prayers)', 'Holy Symbol', 'Parchment (sheet)', 'Robe'],
    description: 'You served in a temple, among rites, prayers and sacred texts.',
  },
  'srd-bg-criminal': {
    tools: ["Thieves' Tools"],
    equipment: ['Dagger', "Thieves' Tools", 'Crowbar', 'Pouch', "Traveler's Clothes"],
    description: 'You lived by your wits in the alleys, among pickpockets, break-ins and shady contacts.',
  },
  'srd-bg-sage': {
    featName: 'Magic Initiate (Wizard)',
    tools: ["Calligrapher's Supplies"],
    equipment: ['Quarterstaff', "Calligrapher's Supplies", 'Book (history)', 'Parchment (sheet)', 'Robe'],
    description:
      'You spent your formative years among libraries and masters, studying history and the arcane.',
  },
  'srd-bg-soldier': {
    tools: ['Gaming Set'],
    equipment: ['Spear', 'Shortbow', 'Arrows', 'Gaming Set', "Healer's Kit", 'Quiver', "Traveler's Clothes"],
    description: 'You trained in an army or a militia, learning discipline and tactics.',
  },
};
