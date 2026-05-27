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
import { clusterProductsSmart } from './cluster';

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

export async function runServerSearch(
  query: SearchQuery,
  opts: { signal?: AbortSignal; locale?: 'ko' | 'en' | 'vi'; only?: string } = {},
): Promise<SearchResult> {
  const all = getEnabledAdapters();
  // `only` lets the /setup probe button drive a single adapter through the
  // runner so stats get stamped. Case-insensitive compare against the
  // adapter's id (StoreId). Falls back to the full set on no-match so a
  // typo doesn't return an empty search.
  const onlyFiltered = opts.only
    ? all.filter((a) => a.id.toLowerCase() === opts.only!.toLowerCase())
    : all;
  const baseSet = onlyFiltered.length > 0 ? onlyFiltered : all;
  // When `only` is specified the operator is explicitly probing one adapter,
  // so skip the real/mock filter — they want to see what that adapter returns.
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

  const rawProducts: Product[] = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .map((p) => ({ ...p })); // shallow clone — we'll mutate `tag` below

  // Cluster sibling listings of the same product (e.g. Apple AirPods Pro 2
  // from KREAM / 쿠팡 / 11번가) into one canonical row per product, with
  // alternate merchants attached as MerchantOffer[]. Tagging + reporting
  // operate on this de-duplicated set so scoring isn't biased by
  // duplicate-name spam.
  //
  // LLM-first when ANTHROPIC_API_KEY is configured: Claude groups
  // cross-language and reordered variants that Jaccard token-sets miss.
  // Silently falls back to Jaccard if Claude is unreachable.
  const products = await clusterProductsSmart(rawProducts);

  assignTags(products);

  const report = buildReport(products);

  return {
    id: 's_' + nanoid(8),
    query,
    products,
    report,
    createdAt: Date.now(),
  };
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
