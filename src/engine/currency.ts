import type { Currency } from '@/domain/items';
import { m } from '@/i18n';

export type Coin = keyof Currency;

/** Valore di ciascuna moneta in MR: 1 MP = 10 MO = 20 ME = 100 MA = 1000 MR. */
export const CP_VALUE: Record<Coin, number> = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

/** Ordine dalla moneta di valore più alto. */
export const COINS_DESC: Coin[] = ['pp', 'gp', 'ep', 'sp', 'cp'];

/** Tagli usati da "ottimizza" e per il resto: l'electrum si evita di default. */
export const DEFAULT_DENOMINATIONS: Coin[] = ['pp', 'gp', 'sp', 'cp'];

export const emptyCurrency = (): Currency => ({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });

export function totalCp(cur: Currency): number {
  return COINS_DESC.reduce((a, c) => a + cur[c] * CP_VALUE[c], 0);
}

/** Valore totale in monete d'oro (con decimali). */
export function totalGp(cur: Currency): number {
  return totalCp(cur) / CP_VALUE.gp;
}

/** Il minor numero di monete equivalente a `cp`, usando solo i tagli indicati. */
export function optimize(cp: number, denominations: Coin[] = DEFAULT_DENOMINATIONS): Currency {
  const out = emptyCurrency();
  let rest = Math.max(0, Math.floor(cp));
  const ordered = COINS_DESC.filter((c) => denominations.includes(c));
  if (!ordered.includes('cp')) ordered.push('cp');
  for (const c of ordered) {
    out[c] = Math.floor(rest / CP_VALUE[c]);
    rest -= out[c] * CP_VALUE[c];
  }
  return out;
}

export type CurrencyResult = { ok: true; currency: Currency } | { ok: false; error: string };

/**
 * Cambia `amount` monete `from` in monete `to`. L'eventuale resto torna in tagli più piccoli.
 * Es. 3 MA → MO: 0 MO + 3 MA (non basta); 15 MA → MO: 1 MO + 5 MA.
 */
export function exchange(cur: Currency, from: Coin, to: Coin, amount: number): CurrencyResult {
  const n = Math.floor(amount);
  if (n <= 0) return { ok: false, error: m.engine.invalidQuantity };
  if (cur[from] < n) return { ok: false, error: m.engine.notEnoughCoins };
  const value = n * CP_VALUE[from];
  const converted = Math.floor(value / CP_VALUE[to]);
  const change = optimize(
    value - converted * CP_VALUE[to],
    DEFAULT_DENOMINATIONS.filter((c) => CP_VALUE[c] < CP_VALUE[to]),
  );
  const next = { ...cur, [from]: cur[from] - n };
  next[to] += converted;
  for (const c of COINS_DESC) next[c] += change[c];
  return { ok: true, currency: next };
}

/**
 * Paga una cifra in MR conservando il più possibile le monete possedute,
 * a partire da quelle di valore più alto; il resto torna nei tagli standard.
 */
export function pay(cur: Currency, costCp: number): CurrencyResult {
  const cost = Math.max(0, Math.floor(costCp));
  const total = totalCp(cur);
  if (cost > total) return { ok: false, error: m.engine.notEnoughCoins };
  let rest = total - cost;
  const kept = emptyCurrency();
  for (const c of COINS_DESC) {
    kept[c] = Math.min(cur[c], Math.floor(rest / CP_VALUE[c]));
    rest -= kept[c] * CP_VALUE[c];
  }
  const change = optimize(rest);
  for (const c of COINS_DESC) kept[c] += change[c];
  return { ok: true, currency: kept };
}

/** Peso delle monete: 50 monete = 1 lb. */
export function coinWeightLb(cur: Currency): number {
  return COINS_DESC.reduce((a, c) => a + cur[c], 0) / 50;
}
