/**
 * Cluster a merged adapter result set into one row per *product*, attaching
 * sibling merchant listings as MerchantOffer[] on the canonical row.
 *
 * Without this step the UI shows N nearly-identical "Apple AirPods Pro 2"
 * rows from different merchants — drowning the actual product variety in
 * duplication. With this step a single canonical card surfaces the best
 * listing, and the other merchants render as a compact "available at" rail
 * so the meta-shop comparison is visible at a glance.
 *
 * Clustering signal: token-set Jaccard similarity on normalised product
 * names. Names ≥ 0.55 similarity join the same cluster. This handles:
 *   "Apple AirPods Pro 2" / "Apple Airpods Pro 2nd Gen" → cluster
 *   "Apple AirPods Pro 2" / "Apple AirPods Pro 3"      → distinct (digit diff)
 *   "Apple AirPods Pro 2" / "Apple AirPods Pro 2 이어팁" → distinct
 *   (accessory token "이어팁" pushes Jaccard below threshold)
 *
 * Canonical pick within a cluster = highest Tony Score (best overall),
 * NOT lowest price — we want the recommendation to surface quality, then
 * let the user pick a cheaper merchant from the offer rail if they want.
 */
import 'server-only';
import type { MerchantOffer, Product } from '@/types/product';
import { storeDisplay } from '@/lib/format';

const SIMILARITY_THRESHOLD = 0.55;

/** Cross-language stopwords that add noise without adding identity signal. */
const STOPWORDS = new Set([
  // English
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'in', 'on',
  // Korean particles / common filler
  '의', '와', '및', '용', '를', '이', '가', '에', '도',
]);

function tokens(name: string): Set<string> {
  const normalized = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return new Set(
    normalized
      .split(' ')
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let common = 0;
  for (const t of a) if (b.has(t)) common++;
  const union = a.size + b.size - common;
  return union === 0 ? 0 : common / union;
}

interface Cluster {
  members: Product[];
  tokens: Set<string>;
}

/**
 * Group nearly-identical products into clusters, pick one canonical per
 * cluster, and attach the others as MerchantOffer[] on the canonical.
 *
 * Returns a flat Product[] with at most one entry per cluster. Tag /
 * scoring / report passes downstream operate on this de-duplicated set.
 */
export function clusterProducts(products: Product[]): Product[] {
  if (products.length <= 1) return products;

  const clusters: Cluster[] = [];

  for (const p of products) {
    const t = tokens(p.name);
    if (t.size === 0) {
      // Names that normalise to nothing (e.g. all-symbol) get their own
      // singleton cluster — never merge with anything.
      clusters.push({ members: [p], tokens: t });
      continue;
    }
    let bestIdx = -1;
    let bestSim = 0;
    for (let i = 0; i < clusters.length; i++) {
      const sim = jaccard(t, clusters[i]!.tokens);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = i;
      }
    }
    if (bestSim >= SIMILARITY_THRESHOLD && bestIdx >= 0) {
      clusters[bestIdx]!.members.push(p);
      // Union the cluster's token set so subsequent comparisons match
      // against the full vocabulary seen so far.
      for (const tok of t) clusters[bestIdx]!.tokens.add(tok);
    } else {
      clusters.push({ members: [p], tokens: t });
    }
  }

  return clusters.map((c) => {
    if (c.members.length === 1) return c.members[0]!;

    // Canonical = highest Tony Score. Ties broken by lowest price so the
    // surfaced listing is the best score AND the better deal among equals.
    const sorted = [...c.members].sort((a, b) => {
      const ds = b.score.total - a.score.total;
      return ds !== 0 ? ds : a.finalPrice.amount - b.finalPrice.amount;
    });
    const canonical = sorted[0]!;

    // Other merchants ranked by ascending price — cheapest alternative first.
    const others = c.members
      .filter((p) => p !== canonical)
      .sort((a, b) => a.finalPrice.amount - b.finalPrice.amount);

    // De-duplicate offers by merchant label so the same merchant doesn't
    // appear twice (can happen when SerpAPI surfaces variant listings of
    // the same item from one storefront).
    const seenMerchant = new Set<string>([
      (canonical.merchantName ?? storeDisplay(canonical)).toLowerCase().trim(),
    ]);
    const offers: MerchantOffer[] = [];
    for (const p of others) {
      const label = (p.merchantName ?? storeDisplay(p)).trim();
      const key = label.toLowerCase();
      if (seenMerchant.has(key)) continue;
      seenMerchant.add(key);
      offers.push({
        merchantName: label,
        store: p.store,
        price: p.finalPrice,
        shipDays: p.shipDays,
        buyUrl: p.buyUrl,
      });
    }

    return offers.length > 0 ? { ...canonical, offers } : canonical;
  });
}
