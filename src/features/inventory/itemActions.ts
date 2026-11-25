import type { Draft } from 'immer';
import type { Character } from '@/domain/character';
import type { InventoryItem } from '@/domain/items';
import type { ID } from '@/domain/primitives';

export const MAX_ATTUNED = 3;

/**
 * Equipaggia o toglie un oggetto. Si indossa una sola armatura e un solo scudo alla volta:
 * equipaggiandone uno, gli altri dello stesso tipo vengono tolti.
 */
export function setEquipped(d: Draft<Character>, itemId: ID, equip: boolean) {
  const target = d.inventory.items.find((i) => i.id === itemId);
  if (!target) return;
  if (equip && (target.kind === 'armor' || target.kind === 'shield')) {
    for (const i of d.inventory.items) if (i.kind === target.kind) i.equipped = false;
  }
  target.equipped = equip;
}

/** Id dell'oggetto e di tutto ciò che contiene, ricorsivamente. */
export function descendantIds(items: Pick<InventoryItem, 'id' | 'parentId'>[], rootId: ID): Set<ID> {
  const ids = new Set<ID>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of items) {
      if (i.parentId && ids.has(i.parentId) && !ids.has(i.id)) {
        ids.add(i.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Contenitori in cui un oggetto può essere spostato (non sé stesso né un suo discendente). */
export function validTargets(items: InventoryItem[], itemId: ID): InventoryItem[] {
  const forbidden = descendantIds(items, itemId);
  return items.filter((i) => i.kind === 'container' && !forbidden.has(i.id));
}

/** Sposta un oggetto in un contenitore (o fuori, con null). Restituisce false se la mossa non è valida. */
export function moveItem(d: Draft<Character>, itemId: ID, parentId: ID | null): boolean {
  const item = d.inventory.items.find((i) => i.id === itemId);
  if (!item || item.parentId === parentId) return false;
  if (
    parentId !== null &&
    !validTargets(d.inventory.items as InventoryItem[], itemId).some((c) => c.id === parentId)
  ) {
    return false;
  }
  item.parentId = parentId;
  // Ciò che finisce in uno zaino non è più "indossato".
  if (parentId !== null) item.equipped = false;
  return true;
}

/** Elimina un oggetto con tutto il contenuto; restituisce gli oggetti rimossi (per l'Annulla). */
export function removeItem(d: Draft<Character>, itemId: ID): InventoryItem[] {
  const ids = descendantIds(d.inventory.items, itemId);
  const removed = d.inventory.items
    .filter((i) => ids.has(i.id))
    .map((i) => JSON.parse(JSON.stringify(i)) as InventoryItem);
  d.inventory.items = d.inventory.items.filter((i) => !ids.has(i.id));
  // Riferimenti a munizioni eliminate.
  for (const i of d.inventory.items)
    if (i.weapon?.ammoItemId && ids.has(i.weapon.ammoItemId)) delete i.weapon.ammoItemId;
  return removed;
}

/**
 * Prezzo di vendita proposto, in monete di rame: per le regole l'equipaggiamento si vende a metà del
 * suo valore, mentre tesori (gemme, oggetti d'arte, merci) valgono il prezzo pieno.
 */
export function defaultSalePriceCp(item: Pick<InventoryItem, 'kind' | 'valueCp'>, quantity: number): number {
  const unit = item.valueCp ?? 0;
  return Math.round((item.kind === 'treasure' ? unit : unit / 2) * quantity);
}

/** "12,5", "12.5" o "1.250,5" mo → mr; null se non è un numero valido. */
export const parseGp = (text: string): number | null => {
  const t = text.trim();
  if (!t) return null;
  // Con la virgola i punti sono separatori delle migliaia; senza, il punto è il decimale.
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

/** Aggiunge un incasso alle monete, scomposto in mo, ma e mr (senza toccare le monete già possedute). */
export function addCoins(d: Draft<Character>, cp: number) {
  const total = Math.max(0, Math.round(cp));
  d.inventory.currency.gp += Math.floor(total / 100);
  d.inventory.currency.sp += Math.floor((total % 100) / 10);
  d.inventory.currency.cp += total % 10;
}

/**
 * Vende `quantity` pezzi di un oggetto e incassa `priceCp`. Vendendo tutto l'oggetto sparisce;
 * se è un contenitore, il suo contenuto resta nell'inventario (passa al contenitore superiore).
 */
export function sellItem(d: Draft<Character>, itemId: ID, quantity: number, priceCp: number) {
  const item = d.inventory.items.find((i) => i.id === itemId);
  if (!item) return;
  const sold = Math.min(Math.max(1, Math.floor(quantity)), item.quantity);
  if (sold < item.quantity) {
    item.quantity -= sold;
  } else {
    for (const child of d.inventory.items) if (child.parentId === item.id) child.parentId = item.parentId;
    d.inventory.items = d.inventory.items.filter((i) => i.id !== itemId);
    for (const i of d.inventory.items) if (i.weapon?.ammoItemId === itemId) delete i.weapon.ammoItemId;
  }
  addCoins(d, priceCp);
}

/** Ordine di visualizzazione: albero con figli subito dopo il padre. */
export function treeOrder(items: InventoryItem[]): Array<{ item: InventoryItem; depth: number }> {
  const byParent = new Map<ID | null, InventoryItem[]>();
  const ids = new Set(items.map((i) => i.id));
  for (const i of items) {
    // Un genitore inesistente (dati incoerenti) riporta l'oggetto alla radice.
    const p = i.parentId && ids.has(i.parentId) ? i.parentId : null;
    byParent.set(p, [...(byParent.get(p) ?? []), i]);
  }
  const out: Array<{ item: InventoryItem; depth: number }> = [];
  const visit = (parent: ID | null, depth: number, seen: Set<ID>) => {
    for (const item of byParent.get(parent) ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push({ item, depth });
      visit(item.id, depth + 1, seen);
    }
  };
  visit(null, 0, new Set());
  return out;
}
