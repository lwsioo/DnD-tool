import type { ArmorData } from '@/domain/items';
import { LOCALE, pick } from '@/i18n/locale';

export interface ArmorBase {
  id: string;
  name: string;
  nameEn: string;
  category: ArmorData['category'] | 'shield';
  /** Per lo scudo: bonus alla CA. */
  baseAc: number;
  dexCap: number | null;
  strRequirement?: number;
  stealthDisadvantage: boolean;
  weightLb: number;
  costCp: number;
  /** Tempo per indossare / togliere, testo libero. */
  don: string;
  doff: string;
}

const gp = (n: number) => n * 100;

// prettier-ignore
const ARMOR_IT: ArmorBase[] = [
  { id: 'padded', name: 'Imbottita', nameEn: 'Padded Armor', category: 'light', baseAc: 11, dexCap: null, stealthDisadvantage: true, weightLb: 8, costCp: gp(5), don: '1 minuto', doff: '1 minuto' },
  { id: 'leather', name: 'Cuoio', nameEn: 'Leather Armor', category: 'light', baseAc: 11, dexCap: null, stealthDisadvantage: false, weightLb: 10, costCp: gp(10), don: '1 minuto', doff: '1 minuto' },
  { id: 'studded-leather', name: 'Cuoio Borchiato', nameEn: 'Studded Leather Armor', category: 'light', baseAc: 12, dexCap: null, stealthDisadvantage: false, weightLb: 13, costCp: gp(45), don: '1 minuto', doff: '1 minuto' },
  { id: 'hide', name: 'Pelle', nameEn: 'Hide Armor', category: 'medium', baseAc: 12, dexCap: 2, stealthDisadvantage: false, weightLb: 12, costCp: gp(10), don: '5 minuti', doff: '1 minuto' },
  { id: 'chain-shirt', name: 'Giaco di Maglia', nameEn: 'Chain Shirt', category: 'medium', baseAc: 13, dexCap: 2, stealthDisadvantage: false, weightLb: 20, costCp: gp(50), don: '5 minuti', doff: '1 minuto' },
  { id: 'scale-mail', name: 'Corazza di Scaglie', nameEn: 'Scale Mail', category: 'medium', baseAc: 14, dexCap: 2, stealthDisadvantage: true, weightLb: 45, costCp: gp(50), don: '5 minuti', doff: '1 minuto' },
  { id: 'breastplate', name: 'Corazza di Piastre', nameEn: 'Breastplate', category: 'medium', baseAc: 14, dexCap: 2, stealthDisadvantage: false, weightLb: 20, costCp: gp(400), don: '5 minuti', doff: '1 minuto' },
  { id: 'half-plate', name: 'Mezza Armatura', nameEn: 'Half Plate Armor', category: 'medium', baseAc: 15, dexCap: 2, stealthDisadvantage: true, weightLb: 40, costCp: gp(750), don: '5 minuti', doff: '1 minuto' },
  { id: 'ring-mail', name: 'Armatura ad Anelli', nameEn: 'Ring Mail', category: 'heavy', baseAc: 14, dexCap: 0, stealthDisadvantage: true, weightLb: 40, costCp: gp(30), don: '10 minuti', doff: '5 minuti' },
  { id: 'chain-mail', name: 'Cotta di Maglia', nameEn: 'Chain Mail', category: 'heavy', baseAc: 16, dexCap: 0, strRequirement: 13, stealthDisadvantage: true, weightLb: 55, costCp: gp(75), don: '10 minuti', doff: '5 minuti' },
  { id: 'splint', name: 'Armatura a Strisce', nameEn: 'Splint Armor', category: 'heavy', baseAc: 17, dexCap: 0, strRequirement: 15, stealthDisadvantage: true, weightLb: 60, costCp: gp(200), don: '10 minuti', doff: '5 minuti' },
  { id: 'plate', name: 'Armatura Completa', nameEn: 'Plate Armor', category: 'heavy', baseAc: 18, dexCap: 0, strRequirement: 15, stealthDisadvantage: true, weightLb: 65, costCp: gp(1500), don: '10 minuti', doff: '5 minuti' },
  { id: 'shield', name: 'Scudo', nameEn: 'Shield', category: 'shield', baseAc: 2, dexCap: null, stealthDisadvantage: false, weightLb: 6, costCp: gp(10), don: '1 azione', doff: '1 azione' },
];

const TIME_EN: Record<string, string> = {
  '1 minuto': '1 minute',
  '5 minuti': '5 minutes',
  '10 minuti': '10 minutes',
  '1 azione': '1 action',
};

/** Armature SRD nella lingua attiva. */
export const ARMOR: ArmorBase[] =
  LOCALE === 'en'
    ? ARMOR_IT.map((a) => ({
        ...a,
        name: a.nameEn,
        don: TIME_EN[a.don] ?? a.don,
        doff: TIME_EN[a.doff] ?? a.doff,
      }))
    : ARMOR_IT;

export const ARMOR_BY_ID: ReadonlyMap<string, ArmorBase> = new Map(ARMOR.map((a) => [a.id, a]));

export const ARMOR_CATEGORY_LABELS: Record<ArmorBase['category'], string> = pick(
  { light: 'Armatura leggera', medium: 'Armatura media', heavy: 'Armatura pesante', shield: 'Scudo' },
  { light: 'Light armor', medium: 'Medium armor', heavy: 'Heavy armor', shield: 'Shield' },
);

const DEX_MOD = pick('mod. DES', 'Dex modifier');

/** Testo della CA come nelle tabelle: "11 + mod. DES", "14 + mod. DES (max 2)", "18", "+2". */
export function armorAcText(a: ArmorBase): string {
  if (a.category === 'shield') return `+${a.baseAc}`;
  if (a.dexCap === 0) return String(a.baseAc);
  return a.dexCap === null ? `${a.baseAc} + ${DEX_MOD}` : `${a.baseAc} + ${DEX_MOD} (max ${a.dexCap})`;
}
