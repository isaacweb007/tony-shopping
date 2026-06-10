/**
 * Deal ranking — turns raw per-query search results into a ranked "today's
 * deals" list. Pure, no IO; the API route wires it to runServerSearch output.
 *
 * Key constraint: real adapters leave `discountPct` at 0 (they don't report a
 * list price), so a discount-only feed would be empty in production. We instead
 * derive deal-worthiness from how cheap an item is *relative to its own search
 * set* (the median price), and fold in the explicit discountPct when an adapter
 * (or the mock) does provide one. That makes the feed work in both modes.
 */
import type { Product } from '@/types/product';

export interface DealGroup {
  /** The seed query whose search produced these products. */
  query: string;
  products: readonly Product[];
}

export interface Deal {
  product: Product;
  /** Seed query — carried through to the card's click-through. */
  query: string;
  /** Headline discount %: max(adapter discountPct, derived-from-median). */
  discountPct: number;
  /** Strikethrough "before" amount, same currency as product.finalPrice. */
  referenceAmount: number;
  /** referenceAmount − finalPrice.amount, always > 0 for a returned deal. */
  savings: number;
  /** Internal ranking score (not shown). */
  dealScore: number;
}

export interface SelectDealsOpts {
  /** Max deals returned. */
  count: number;
  /** Minimum effective discount % to qualify (default 8). */
  minDiscount?: number;
  /** Max deals from any single query, for variety (default 2). */
  maxPerQuery?: number;
  /** Floor on authenticity so we never headline a sketchy listing (default 70). */
  minAuthenticity?: number;
}

// Ranking weights — discount is the headline, price-edge and overall score
// are quality nudges. Tuned so a big discount outranks a marginal one while
// a higher-quality listing wins ties.
const W_DISCOUNT = 1.5;
const W_PRICE_EDGE = 0.4;
const W_SCORE = 0.3;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

/**
 * Build a single product's deal candidate within its group, or null if it
 * doesn't clear the discount / authenticity / savings gates.
 */
function toDeal(
  product: Product,
  query: string,
  reference: number,
  minDiscount: number,
  minAuthenticity: number,
): Deal | null {
  if (product.authenticityPct < minAuthenticity) return null;

  const final = product.finalPrice.amount;
  if (final <= 0) return null;

  // Clamp to <90% so reconstructing the list price below never divides by a
  // near-zero (an adapter reporting a bogus 95–100% "discount" would otherwise
  // yield an Infinity / absurd strikethrough price). Such values fall back to
  // the median-derived discount instead.
  const realDiscount = Math.min(89, Math.max(0, Math.round(product.discountPct)));
  const derivedDiscount =
    reference > final ? Math.round((1 - final / reference) * 100) : 0;

  let discountPct: number;
  let referenceAmount: number;
  if (realDiscount > 0 && realDiscount >= derivedDiscount) {
    discountPct = realDiscount;
    // Reconstruct the list price from the reported discount.
    referenceAmount = Math.round(final / (1 - realDiscount / 100));
  } else {
    discountPct = derivedDiscount;
    referenceAmount = reference;
  }

  const savings = referenceAmount - final;
  if (discountPct < minDiscount || savings <= 0) return null;

  const dealScore =
    discountPct * W_DISCOUNT +
    product.score.priceEdge * W_PRICE_EDGE +
    product.score.total * W_SCORE;

  return { product, query, discountPct, referenceAmount, savings, dealScore };
}

/**
 * Rank deals across all groups. Per-group cap keeps one popular query from
 * dominating; final list is deduped by product id and sorted by deal score.
 */
export function selectDeals(groups: readonly DealGroup[], opts: SelectDealsOpts): Deal[] {
  const minDiscount = opts.minDiscount ?? 8;
  const maxPerQuery = opts.maxPerQuery ?? 2;
  const minAuthenticity = opts.minAuthenticity ?? 70;

  const collected: Deal[] = [];
  for (const group of groups) {
    if (group.products.length === 0) continue;
    const reference = median(group.products.map((p) => p.finalPrice.amount));
    const groupDeals: Deal[] = [];
    for (const p of group.products) {
      const deal = toDeal(p, group.query, reference, minDiscount, minAuthenticity);
      if (deal) groupDeals.push(deal);
    }
    groupDeals.sort((a, b) => b.dealScore - a.dealScore);
    collected.push(...groupDeals.slice(0, maxPerQuery));
  }

  // Dedup by product id (defensive — same listing surfacing in two groups),
  // keeping the higher-scoring instance.
  const byId = new Map<string, Deal>();
  for (const d of collected) {
    const existing = byId.get(d.product.id);
    if (!existing || d.dealScore > existing.dealScore) byId.set(d.product.id, d);
  }

  return [...byId.values()]
    .sort((a, b) => b.dealScore - a.dealScore)
    .slice(0, Math.max(0, opts.count));
}
