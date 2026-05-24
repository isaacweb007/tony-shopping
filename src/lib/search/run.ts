/**
 * Server-side search aggregator. Fans out to every enabled adapter in parallel,
 * tolerates individual failures, then assigns Tony tags (best/cheap/fast)
 * across the merged set and computes the report.
 */
import 'server-only';
import { nanoid } from 'nanoid';
import type { Product, TonyReport, TonyTag } from '@/types/product';
import type { SearchQuery, SearchResult } from '@/types/search';
import { getEnabledAdapters } from '@/lib/adapters/registry';
import { withTimeout } from '@/lib/adapters/base';

const PER_ADAPTER_LIMIT = 4;
const ADAPTER_TIMEOUT_MS = 1500;

export async function runServerSearch(
  query: SearchQuery,
  opts: { signal?: AbortSignal } = {},
): Promise<SearchResult> {
  const adapters = getEnabledAdapters();
  const results = await Promise.allSettled(
    adapters.map((a) =>
      a.search({
        q: query.q,
        limit: PER_ADAPTER_LIMIT,
        signal: withTimeout(opts.signal, ADAPTER_TIMEOUT_MS),
      }),
    ),
  );

  const products: Product[] = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .map((p) => ({ ...p })); // shallow clone — we'll mutate `tag` below

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
