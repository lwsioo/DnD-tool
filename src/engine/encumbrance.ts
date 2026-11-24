import type { Character } from '@/domain/character';
import type { InventoryItem } from '@/domain/items';
import type { ID } from '@/domain/primitives';
import { coinWeightLb } from './currency';

/**
 * Peso trasportato: somma di quantità × peso. Il contenuto dei contenitori "senza peso"
 * (Borsa Conservante) non conta, il contenitore stesso sì.
 */
export function carriedWeightLb(items: InventoryItem[]): number {
  const byId = new Map<ID, InventoryItem>(items.map((i) => [i.id, i]));
  const insideWeightless = (item: InventoryItem): boolean => {
    const seen = new Set<ID>();
    for (let p = item.parentId; p; p = byId.get(p)?.parentId ?? null) {
      if (seen.has(p)) return false; // ciclo: dati corrotti, non bloccare il calcolo
      seen.add(p);
      if (byId.get(p)?.container?.weightless) return true;
    }
    return false;
  };
  const total = items.reduce(
    (acc, i) => (insideWeightless(i) ? acc : acc + (i.weightLb ?? 0) * Math.max(0, i.quantity)),
    0,
  );
  return Math.round(total * 100) / 100;
}

export type EncumbranceStatus = 'ok' | 'encumbered' | 'heavilyEncumbered' | 'over';

export interface EncumbranceResult {
  weightLb: number;
  capacityLb: number;
  status: EncumbranceStatus;
}

/** Capacità di carico: FOR × 15 lb (×2 per creature Grandi). */
export function carryingCapacity(strScore: number, size: Character['identity']['size']): number {
  return strScore * 15 * (size === 'L' ? 2 : 1);
}

/**
 * 'standard': solo il superamento della capacità.
 * 'variant': Ingombrato oltre FOR × 5, Pesantemente Ingombrato oltre FOR × 10.
 * Il peso delle monete è incluso.
 */
export function computeEncumbrance(c: Character, strScore: number): EncumbranceResult {
  const weightLb = carriedWeightLb(c.inventory.items) + coinWeightLb(c.inventory.currency);
  const capacityLb = carryingCapacity(strScore, c.identity.size);
  const sizeFactor = c.identity.size === 'L' ? 2 : 1;
  let status: EncumbranceStatus = 'ok';
  if (weightLb > capacityLb) status = 'over';
  else if (c.settings.encumbranceRule === 'variant') {
    if (weightLb > strScore * 10 * sizeFactor) status = 'heavilyEncumbered';
    else if (weightLb > strScore * 5 * sizeFactor) status = 'encumbered';
  }
  return { weightLb, capacityLb, status };
}
