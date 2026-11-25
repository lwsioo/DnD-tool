import { Coins } from 'lucide-react';
import { useState } from 'react';
import type { InventoryItem } from '@/domain/items';
import { formatCost } from '@/lib/units';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { FieldLabel, inputClass } from '@/ui/fields';
import { defaultSalePriceCp, parseGp } from './itemActions';
import { m } from '@/i18n';

const it = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
const toGpText = (cp: number) => it.format(cp / 100);
interface SellDialogProps {
  item: InventoryItem;
  /** Quanti oggetti contiene (se è un contenitore): restano nell'inventario. */
  contents: number;
  onSell: (quantity: number, priceCp: number) => void;
  onClose: () => void;
}

/** Vendita di un oggetto: quantità e prezzo proposti (modificabili), poi le monete si aggiungono da sole. */
export function SellDialog({ item, contents, onSell, onClose }: SellDialogProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [priceText, setPriceText] = useState(() => toGpText(defaultSalePriceCp(item, item.quantity)));
  const [priceTouched, setPriceTouched] = useState(false);
  const price = parseGp(priceText);
  const unit = item.valueCp ?? 0;

  const changeQuantity = (q: number) => {
    const n = Math.min(item.quantity, Math.max(1, Math.floor(q) || 1));
    setQuantity(n);
    // Finché l'utente non ha scritto un prezzo suo, il prezzo segue la quantità.
    if (!priceTouched) setPriceText(toGpText(defaultSalePriceCp(item, n)));
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={m.inventory.sellTitle(item.name)}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button
            variant="primary"
            icon={Coins}
            disabled={price === null}
            onClick={() => price !== null && onSell(quantity, price)}
            data-autofocus
          >
            {m.inventory.sellFor(price === null ? '…' : `${toGpText(price)} ${m.inventory.gp}`)}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          {unit > 0
            ? `${m.inventory.value(formatCost(unit), item.quantity > 1)} ${item.kind === 'treasure' ? m.inventory.fullPrice : m.inventory.halfPrice}`
            : m.inventory.noValue}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {item.quantity > 1 && (
            <FieldLabel label={m.inventory.sellQuantity(item.quantity)}>
              <input
                aria-label={m.inventory.sellQuantityAria}
                inputMode="numeric"
                className={inputClass}
                value={quantity}
                onChange={(e) => changeQuantity(Number(e.target.value))}
              />
            </FieldLabel>
          )}
          <FieldLabel label={m.inventory.totalPrice}>
            <input
              aria-label={m.inventory.priceAria}
              inputMode="decimal"
              className={inputClass}
              value={priceText}
              onChange={(e) => {
                setPriceTouched(true);
                setPriceText(e.target.value);
              }}
            />
          </FieldLabel>
        </div>
        {price === null && <p className="text-xs text-danger">{m.inventory.badNumber}</p>}
        {contents > 0 && quantity >= item.quantity && (
          <p className="text-xs text-muted">
            {m.inventory.contentsStay(contents)}
          </p>
        )}
      </div>
    </Dialog>
  );
}
