import type { ItemKind } from '@/domain/items';
import { pick } from '@/i18n/locale';

/**
 * Equipaggiamento iniziale delle classi (regole 2024): ogni classe offre un'opzione A con oggetti
 * e monete, una B solo monete (il Guerriero ha anche una C). Le armi e armature indicano la voce SRD
 * (`weapon:<id>` / `armor:<id>`), così arrivano già pronte con CA, danni e Maestria.
 */
export interface ClassEquipmentLine {
  /** Voce SRD da cui creare l'oggetto (arma, armatura, scudo). */
  srd?: string;
  /** Nome mostrato; per le voci SRD sostituisce quello della tabella solo se indicato. */
  name?: string;
  quantity?: number;
  kind?: ItemKind;
  weightLb?: number;
}

export interface ClassEquipmentOption {
  key: 'A' | 'B' | 'C';
  items: ClassEquipmentLine[];
  gold: number;
}

const gear = (it: string, en: string, weightLb?: number, quantity = 1): ClassEquipmentLine => ({
  name: pick(it, en),
  quantity,
  weightLb,
  kind: 'gear',
});
const focus = (it: string, en: string, weightLb?: number): ClassEquipmentLine => ({
  name: pick(it, en),
  weightLb,
  kind: 'focus',
});
const tool = (it: string, en: string, weightLb?: number): ClassEquipmentLine => ({
  name: pick(it, en),
  weightLb,
  kind: 'tool',
});
const w = (id: string, quantity = 1, name?: [string, string]): ClassEquipmentLine => ({
  srd: `weapon:${id}`,
  quantity,
  name: name && pick(...name),
});
const a = (id: string): ClassEquipmentLine => ({ srd: `armor:${id}` });
const arrows = (n: number): ClassEquipmentLine => ({
  name: pick('Frecce', 'Arrows'),
  quantity: n,
  weightLb: 0.05,
  kind: 'ammunition',
});
const quiver = (): ClassEquipmentLine => ({
  name: pick('Faretra', 'Quiver'),
  weightLb: 1,
  kind: 'container',
});
const onlyGold = (key: 'B' | 'C', gold: number): ClassEquipmentOption => ({ key, items: [], gold });

const EXPLORER = gear('Dotazione da Esploratore', "Explorer's Pack", 55);
const DUNGEONEER = gear('Dotazione da Esploratore di Dungeon', "Dungeoneer's Pack", 55);
const PRIEST = gear('Dotazione da Sacerdote', "Priest's Pack", 29);
const SCHOLAR = gear('Dotazione da Studioso', "Scholar's Pack", 22);
const ENTERTAINER = gear('Dotazione da Intrattenitore', "Entertainer's Pack", 58);
const BURGLAR = gear('Dotazione da Scassinatore', "Burglar's Pack", 42);
const HOLY_SYMBOL = focus('Simbolo Sacro', 'Holy Symbol', 1);

export const CLASS_EQUIPMENT: Record<string, ClassEquipmentOption[]> = {
  barbarian: [{ key: 'A', items: [w('greataxe'), w('handaxe', 4), EXPLORER], gold: 15 }, onlyGold('B', 75)],
  bard: [
    {
      key: 'A',
      items: [
        a('leather'),
        w('dagger', 2),
        tool('Strumento musicale (a scelta)', 'Musical Instrument (your choice)', 3),
        ENTERTAINER,
      ],
      gold: 19,
    },
    onlyGold('B', 90),
  ],
  cleric: [
    { key: 'A', items: [a('chain-shirt'), a('shield'), w('mace'), HOLY_SYMBOL, PRIEST], gold: 7 },
    onlyGold('B', 110),
  ],
  druid: [
    {
      key: 'A',
      items: [
        a('leather'),
        a('shield'),
        w('sickle'),
        w('quarterstaff', 1, ['Bastone Ferrato (focus druidico)', 'Quarterstaff (Druidic Focus)']),
        EXPLORER,
        tool('Borsa da Erborista', 'Herbalism Kit', 3),
      ],
      gold: 9,
    },
    onlyGold('B', 50),
  ],
  fighter: [
    { key: 'A', items: [a('chain-mail'), w('greatsword'), w('flail'), w('javelin', 8), DUNGEONEER], gold: 4 },
    {
      key: 'B',
      items: [
        a('studded-leather'),
        w('scimitar'),
        w('shortsword'),
        w('longbow'),
        arrows(20),
        quiver(),
        DUNGEONEER,
      ],
      gold: 11,
    },
    onlyGold('C', 155),
  ],
  monk: [
    {
      key: 'A',
      items: [
        w('spear'),
        w('dagger', 5),
        tool(
          'Strumenti da artigiano o strumento musicale (a scelta)',
          "Artisan's Tools or Musical Instrument (your choice)",
          5,
        ),
        EXPLORER,
      ],
      gold: 11,
    },
    onlyGold('B', 50),
  ],
  paladin: [
    {
      key: 'A',
      items: [a('chain-mail'), a('shield'), w('longsword'), w('javelin', 6), HOLY_SYMBOL, PRIEST],
      gold: 9,
    },
    onlyGold('B', 150),
  ],
  ranger: [
    {
      key: 'A',
      items: [
        a('studded-leather'),
        w('scimitar'),
        w('shortsword'),
        w('longbow'),
        arrows(20),
        quiver(),
        focus('Focus Druidico (rametto di vischio)', 'Druidic Focus (sprig of mistletoe)'),
        EXPLORER,
      ],
      gold: 7,
    },
    onlyGold('B', 150),
  ],
  rogue: [
    {
      key: 'A',
      items: [
        a('leather'),
        w('dagger', 2),
        w('shortsword'),
        w('shortbow'),
        arrows(20),
        quiver(),
        tool('Arnesi da Scasso', "Thieves' Tools", 1),
        BURGLAR,
      ],
      gold: 8,
    },
    onlyGold('B', 100),
  ],
  sorcerer: [
    {
      key: 'A',
      items: [
        w('spear'),
        w('dagger', 2),
        focus('Focus Arcano (cristallo)', 'Arcane Focus (crystal)', 1),
        DUNGEONEER,
      ],
      gold: 28,
    },
    onlyGold('B', 50),
  ],
  warlock: [
    {
      key: 'A',
      items: [
        a('leather'),
        w('sickle'),
        w('dagger', 2),
        focus('Focus Arcano (globo)', 'Arcane Focus (orb)', 3),
        gear('Libro (sapere occulto)', 'Book (occult lore)', 5),
        SCHOLAR,
      ],
      gold: 15,
    },
    onlyGold('B', 100),
  ],
  wizard: [
    {
      key: 'A',
      items: [
        w('dagger', 2),
        w('quarterstaff', 1, ['Bastone Ferrato (focus arcano)', 'Quarterstaff (Arcane Focus)']),
        gear('Veste', 'Robe', 4),
        gear('Libro degli Incantesimi', 'Spellbook', 3),
        SCHOLAR,
      ],
      gold: 5,
    },
    onlyGold('B', 55),
  ],
};
