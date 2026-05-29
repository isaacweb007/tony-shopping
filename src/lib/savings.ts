/**
 * Savings computation — the concrete "why go through Tony" number.
 *
 * A percentage ("18% 저렴") is abstract; a won figure ("₩42,000 아꼈어요")
 * is felt. These helpers turn a recommended product + its peer set into a
 * concrete savings amount the UI can show prominently, and feed the
 * cumulative savings tracker.
 *
 * Honest framing: we compare against the peer MEDIAN (the typical market
 * price), not the single most expensive listing — comparing to the worst
 * option would inflate the number misleadingly.
 */
import type { Money, Product } from '@/types/product';

export interface SavingsResult {
  /** Won/USD/etc. saved vs the peer median. 0 when not cheaper. */
  amount: number;
  /** Percent below median (0–100). */
  pct: number;
  /** Currency of `amount`, matching the product. */
  currency: Money['currency'];
  /** Median peer price the saving is measured against. */
  median: number;
  /** Whether there was enough peer data to compute a meaningful saving. */
  meaningful: boolean;
}

const MIN_PEERS = 3;
const MIN_PCT = 3; // below this, the "saving" is noise

/**
 * Compute how much cheaper `product` is than the median of `peers`
 * (peers should include the product itself or not — it's filtered by
 * price validity either way). Same-currency assumption: a meta-search
 * locale returns one currency, so we don't cross-convert here.
 */
export function computeSavings(product: Product, peers: Product[]): SavingsResult {
  const currency = product.finalPrice.currency;
  const amounts = peers
    .filter((p) => p.finalPrice.currency === currency && p.finalPrice.amount > 0)
    .map((p) => p.finalPrice.amount)
    .sort((a, b) => a - b);

  if (amounts.length < MIN_PEERS) {
    return { amount: 0, pct: 0, currency, median: 0, meaningful: false };
  }

  const mid = Math.floor(amounts.length / 2);
  const median =
    amounts.length % 2 === 0 ? Math.round((amounts[mid - 1]! + amounts[mid]!) / 2) : amounts[mid]!;

  const price = product.finalPrice.amount;
  if (price >= median) {
    return { amount: 0, pct: 0, currency, median, meaningful: false };
  }

  const amount = median - price;
  const pct = Math.round((amount / median) * 100);
  return {
    amount,
    pct,
    currency,
    median,
    meaningful: pct >= MIN_PCT,
  };
}
