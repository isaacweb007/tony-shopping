/**
 * Cron re-fetch matching — given a watched shortlist row and a freshly-run
 * search, find the product that corresponds to it so we can read its current
 * price. Pure, no IO; the cron route wires it to runServerSearch results.
 */
import type { Product } from '@/types/product';

export interface WatchedRow {
  productId: string;
  name: string;
  store: string;
  /** The currency the row was saved in — a cross-currency price isn't comparable. */
  currency: string;
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Match priority:
 *   1. Exact product id — stable per merchant for the real adapters
 *      (coupang_…, amzn_…, serp_…), which are the ones that matter in prod.
 *   2. Same normalized name — prefer the same store, else the cheapest, so a
 *      product that re-surfaced under a drifted id still tracks instead of
 *      silently going stale.
 * Currency must match the watched row in both paths.
 */
export function matchWatchedProduct(
  row: WatchedRow,
  products: readonly Product[],
): Product | null {
  const byId = products.find(
    (p) => p.id === row.productId && p.finalPrice.currency === row.currency,
  );
  if (byId) return byId;

  const target = normalizeName(row.name);
  if (!target) return null;
  const named = products.filter(
    (p) => normalizeName(p.name) === target && p.finalPrice.currency === row.currency,
  );
  if (named.length === 0) return null;
  const sameStore = named.find((p) => p.store === row.store);
  if (sameStore) return sameStore;
  return named.reduce((cheapest, p) =>
    p.finalPrice.amount < cheapest.finalPrice.amount ? p : cheapest,
  );
}
