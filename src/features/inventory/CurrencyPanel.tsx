import { cn } from '@/lib/cn';
import { ArrowRightLeft, Coins } from 'lucide-react';
import { useState } from 'react';
import { CURRENCY_LABELS } from '@/data/i18n/it';
import type { Character } from '@/domain/character';
import { COINS_DESC, exchange, optimize, pay, totalCp, totalGp, type Coin } from '@/engine/currency';
import type { CharacterRecipe } from '@/db/repos/characters';
import { toast } from '@/stores/toastStore';
import { Button } from '@/ui/Button';
import { inputClass, NumberField, Select } from '@/ui/fields';

const gpFormat = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
const COIN_OPTIONS = COINS_DESC.map((c) => ({ value: c, label: CURRENCY_LABELS[c].short }));

interface CurrencyPanelProps {
  character: Character;
  mutate: (recipe: CharacterRecipe) => void;
  mutateLater: (key: string, recipe: CharacterRecipe) => void;
}

/** Monete con convertitore, pagamento con resto e "ottimizza". */
export function CurrencyPanel({ character, mutate, mutateLater }: CurrencyPanelProps) {
  const cur = character.inventory.currency;
  const [from, setFrom] = useState<Coin>('sp');
  const [to, setTo] = useState<Coin>('gp');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');
  const [costCoin, setCostCoin] = useState<Coin>('gp');

  const doExchange = () => {
    const r = exchange(cur, from, to, Number(amount));
    if (!r.ok) return toast({ tone: 'error', message: r.error });
    mutate((d) => void (d.inventory.currency = r.currency));
    setAmount('');
  };

  const doPay = () => {
    const n = Number(cost.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    const cp = Math.round(n * { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 }[costCoin]);
    const r = pay(cur, cp);
    if (!r.ok) return toast({ tone: 'error', message: r.error });
    mutate((d) => void (d.inventory.currency = r.currency));
    toast({ tone: 'success', message: `Pagati ${cost} ${CURRENCY_LABELS[costCoin].short}.` });
    setCost('');
  };

  return (
    <section aria-label="Monete" className="space-y-3 rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-2">
        <Coins className="size-4 text-accent" aria-hidden />
        <h2 className="flex-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Monete</h2>
        <span className="text-sm" aria-label="Valore totale">
          Totale: <strong>{gpFormat.format(totalGp(cur))} mo</strong>
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {COINS_DESC.map((c) => (
          <label key={c} className="space-y-1 text-center" title={CURRENCY_LABELS[c].long}>
            <span className="block text-xs font-bold text-muted">{CURRENCY_LABELS[c].short}</span>
            <NumberField
              label={CURRENCY_LABELS[c].long}
              value={cur[c]}
              min={0}
              max={9_999_999}
              onValue={(v) => mutateLater(`coin.${c}`, (d) => void (d.inventory.currency[c] = v))}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 text-sm">
        <div className="flex items-center gap-1.5">
          <input
            aria-label="Quantità da cambiare"
            inputMode="numeric"
            placeholder="Q.tà"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            className={cn(inputClass, 'w-16')}
          />
          <Select
            label="Moneta di partenza"
            value={from}
            onValue={setFrom}
            options={COIN_OPTIONS}
            className="w-auto"
          />
          <ArrowRightLeft className="size-4 text-muted" aria-hidden />
          <Select
            label="Moneta di arrivo"
            value={to}
            onValue={setTo}
            options={COIN_OPTIONS}
            className="w-auto"
          />
          <Button size="sm" onClick={doExchange} disabled={!amount || from === to}>
            Cambia
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            aria-label="Importo da pagare"
            inputMode="decimal"
            placeholder="Spesa"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className={cn(inputClass, 'w-20')}
          />
          <Select
            label="Moneta della spesa"
            value={costCoin}
            onValue={setCostCoin}
            options={COIN_OPTIONS}
            className="w-auto"
          />
          <Button size="sm" onClick={doPay} disabled={!cost}>
            Paga
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          title="Converte tutto nel minor numero di monete (senza electrum)"
          onClick={() => mutate((d) => void (d.inventory.currency = optimize(totalCp(d.inventory.currency))))}
        >
          Ottimizza
        </Button>
      </div>
    </section>
  );
}
