/**
 * Server-side search aggregator. Fans out to every enabled adapter in parallel,
 * tolerates individual failures, then assigns Tony tags (best/cheap/fast)
 * across the merged set and computes the report.
 */
import 'server-only';
import { nanoid } from 'nanoid';
import type { Product, StoreId, TonyReport, TonyTag } from '@/types/product';
import type { SearchQuery, SearchResult } from '@/types/search';
import { getEnabledAdapters } from '@/lib/adapters/registry';
import { withTimeout, type SearchAdapter } from '@/lib/adapters/base';
import { recordAdapterCall } from '@/lib/adapter-stats';
import { ADAPTER_MODE } from '@/lib/env';
import { clusterProducts, clusterProductsSmart } from './cluster';

// Pulled wider than the visible card count so the clusterer has material
// to work with — a single adapter may surface the same product from many
// merchants (SerpAPI's `multiple_sources: true` cases). After clustering
// we collapse back down to the canonical listings.
const PER_ADAPTER_LIMIT = 16;
// SerpAPI live calls routinely take 2-4 s; mocks return in ~200 ms.
// 5 s gives the real adapter room without blocking the UI noticeably.
const ADAPTER_TIMEOUT_MS = 5000;

/** Map an adapter's StoreId to its ADAPTER_MODE key. */
const ID_TO_MODE_KEY: Partial<Record<StoreId, keyof typeof ADAPTER_MODE>> = {
  Coupang: 'coupang',
  NaverShopping: 'naver',
  Amazon: 'amazon',
  eBay: 'ebay',
  Shopee: 'shopee',
  Lazada: 'lazada',
  Rakuten: 'rakuten',
  YahooJP: 'yahoojp',
  AliExpress: 'aliexpress',
  GoogleShopping: 'serpapi',
};

function adapterIsReal(a: SearchAdapter): boolean {
  const key = ID_TO_MODE_KEY[a.id];
  return key ? ADAPTER_MODE[key]().real : false;
}

/**
 * Production hygiene: once ANY adapter is configured with real credentials,
 * stop mixing deterministic mock results into the live feed. The verdict card
 * and Tony Score would otherwise be dominated by synthetic products. When zero
 * real adapters exist (fresh deploy / demo), keep mocks so the UI isn't empty.
 */
function selectAdapters(all: SearchAdapter[]): SearchAdapter[] {
  const anyReal = all.some(adapterIsReal);
  return anyReal ? all.filter(adapterIsReal) : all;
}

/**
 * Adapter fan-out — fetches raw products from every enabled adapter in
 * parallel, tolerating individual failures. No clustering / tagging yet.
 * Returns shallow-cloned products so downstream mutation (tags) is safe.
 */
export async function fetchRawProducts(
  query: SearchQuery,
  opts: { signal?: AbortSignal; locale?: 'ko' | 'en' | 'vi'; only?: string } = {},
): Promise<Product[]> {
  const all = getEnabledAdapters();
  // `only` lets the /setup probe button drive a single adapter through the
  // runner so stats get stamped. Case-insensitive compare against the
  // adapter's id (StoreId). Falls back to the full set on no-match.
  const onlyFiltered = opts.only
    ? all.filter((a) => a.id.toLowerCase() === opts.only!.toLowerCase())
    : all;
  const baseSet = onlyFiltered.length > 0 ? onlyFiltered : all;
  const adapters = opts.only ? baseSet : selectAdapters(baseSet);

  const results = await Promise.allSettled(
    adapters.map(async (a) => {
      const t0 = Date.now();
      try {
        const products = await a.search({
          q: query.q,
          limit: PER_ADAPTER_LIMIT,
          locale: opts.locale,
          signal: withTimeout(opts.signal, ADAPTER_TIMEOUT_MS),
        });
        const first = products[0];
        recordAdapterCall(a.id, {
          lastAt: Date.now(),
          lastDurationMs: Date.now() - t0,
          lastOk: true,
          lastResultCount: products.length,
          lastSample: first
            ? {
                name: first.name,
                priceAmount: first.finalPrice.amount,
                priceCurrency: first.finalPrice.currency,
              }
            : null,
        });
        return products;
      } catch (err) {
        const message =
          err instanceof Error
            ? `${err.name}: ${err.message}`
            : typeof err === 'string'
              ? err
              : 'unknown error';
        recordAdapterCall(a.id, {
          lastAt: Date.now(),
          lastDurationMs: Date.now() - t0,
          lastOk: false,
          lastResultCount: 0,
          lastError: message,
        });
        throw err;
      }
    }),
  );

  return results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .map((p) => ({ ...p }));
}

/**
 * Tag + report a clustered product set into a SearchResult. Mutates the
 * passed products' `tag` field. Pure otherwise.
 */
export function finalizeResult(query: SearchQuery, clustered: Product[]): SearchResult {
  assignTags(clustered);
  const report = buildReport(clustered);
  return {
    id: 's_' + nanoid(8),
    query,
    products: clustered,
    report,
    createdAt: Date.now(),
  };
}

export async function runServerSearch(
  query: SearchQuery,
  opts: { signal?: AbortSignal; locale?: 'ko' | 'en' | 'vi'; only?: string } = {},
): Promise<SearchResult> {
  const rawProducts = await fetchRawProducts(query, opts);
  // LLM-first clustering when ANTHROPIC_API_KEY is configured; Jaccard
  // fallback otherwise. Groups sibling listings of the same product.
  const products = await clusterProductsSmart(rawProducts);
  return finalizeResult(query, products);
}

/**
 * Streaming-friendly two-phase search:
 *   onFast(result)    — fired ASAP with Jaccard-clustered results (~adapter
 *                       latency only, no LLM wait)
 *   returns           — the LLM-refined result (Claude clustering applied)
 *
 * Fetches raw products ONCE and clusters two ways, so the SerpAPI call (and
 * its cost) happens a single time. The /api/search/stream route wires
 * onFast → first NDJSON chunk, return value → second chunk.
 */
export async function runServerSearchStreaming(
  query: SearchQuery,
  opts: { signal?: AbortSignal; locale?: 'ko' | 'en' | 'vi' },
  onFast: (result: SearchResult) => void,
): Promise<SearchResult> {
  const rawProducts = await fetchRawProducts(query, opts);

  // Phase 1 — instant Jaccard clustering. Clone so phase-2 tagging doesn't
  // collide with phase-1's mutated tags.
  const fastClustered = clusterProducts(rawProducts.map((p) => ({ ...p })));
  onFast(finalizeResult(query, fastClustered));

  // Phase 2 — LLM clustering on a fresh clone.
  const refinedClustered = await clusterProductsSmart(rawProducts.map((p) => ({ ...p })));
  return finalizeResult(query, refinedClustered);
}

function assignTags(products: Product[]) {
  if (products.length === 0) return;
  const byScore = [...products].sort((a, b) => b.score.total - a.score.total);
  const byPrice = [...products].sort((a, b) => a.finalPrice.amount - b.finalPrice.amount);
  const byShip = [...products].sort((a, b) => a.shipDays - b.shipDays);
  const byAuth = [...products].sort((a, b) => b.authenticityPct - a.authenticityPct);

  // Default tag.
  products.forEach((p) => {
    p.tag = 'value';
  });

  const tag = (p: Product | undefined, t: TonyTag) => {
    if (p && p.tag === 'value') p.tag = t;
  };
  tag(byScore[0], 'best');
  tag(byPrice[0], 'cheap');
  tag(byShip[0], 'fast');
  tag(byAuth[0], 'genuine');

  // Mark a few low-trust as "not" (just below 50% authenticity and <120 reviews).
  for (const p of products) {
    if (p.tag === 'value' && p.authenticityPct < 65 && p.reviewCount < 200) {
      p.tag = 'not';
    }
  }
}

function buildReport(products: Product[]): TonyReport {
  if (products.length === 0) {
    // Synthesize an empty-but-typed report. The UI should defensively render.
    const empty: Product = {
      id: 'empty',
      name: '',
      store: 'Coupang',
      country: 'KR',
      price: { amount: 0, currency: 'KRW' },
      finalPrice: { amount: 0, currency: 'KRW' },
      shippingFee: { amount: 0, currency: 'KRW' },
      shipDays: 0,
      rating: 0,
      reviewCount: 0,
      authenticityPct: 0,
      official: false,
      discountPct: 0,
      imageUrl: '',
      tag: 'value',
      score: { total: 0, similarity: 0, priceEdge: 0, reviewTrust: 0, authenticity: 0 },
      buyUrl: '#',
    };
    return {
      total: 0,
      highlySimilar: 0,
      similar: 0,
      avgTony: 0,
      avgAuthenticity: 0,
      cheapest: empty,
      fastest: empty,
      best: empty,
    };
  }

  const total = products.length;
  const highlySimilar = products.filter((p) => p.score.similarity >= 92).length;
  const similar = total - highlySimilar;
  const avgTony = Math.round(products.reduce((a, p) => a + p.score.total, 0) / total);
  const avgAuthenticity = Math.round(
    products.reduce((a, p) => a + p.authenticityPct, 0) / total,
  );
  const cheapest = [...products].sort((a, b) => a.finalPrice.amount - b.finalPrice.amount)[0]!;
  const fastest = [...products].sort((a, b) => a.shipDays - b.shipDays)[0]!;
  const best = [...products].sort((a, b) => b.score.total - a.score.total)[0]!;

  return { total, highlySimilar, similar, avgTony, avgAuthenticity, cheapest, fastest, best };
}
