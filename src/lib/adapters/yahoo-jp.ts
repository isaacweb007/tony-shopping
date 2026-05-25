/**
 * Yahoo! Shopping (Japan) — Web Services V3 adapter.
 *
 * Docs: https://developer.yahoo.co.jp/webapi/shopping/v3/itemsearch.html
 *   GET https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch
 *       ?appid=...&query=...&results=...
 *
 * Free tier with Application ID.
 * Falls back to deterministic mock when YAHOO_JP_APP_ID isn't set.
 */
import 'server-only';
import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';
import { ADAPTER_MODE } from '@/lib/env';
import { computeTonyScore } from '@/lib/scoring';
import type { Product } from '@/types/product';

const SEARCH_URL = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';
const REF_PRICE = 4000; // JPY reference

interface YahooHit {
  index: number;
  name: string;
  code: string;
  url: string;
  affiliateUrl?: string;
  image?: { medium?: string; small?: string };
  price?: number;
  premiumPrice?: number;
  shipping?: { name?: string; code?: number };
  seller?: { name?: string; sellerId?: string; isPMallSeller?: boolean; review?: { rate?: number; count?: number } };
  review?: { rate?: number; count?: number };
}

interface YahooEnvelope {
  hits?: YahooHit[];
}

function toProduct(hit: YahooHit, idx: number): Product {
  const priceAmt = Math.round(hit.premiumPrice ?? hit.price ?? 0);
  // Yahoo JP rolls shipping into "shipping.name"; treat unknown as 0.
  const shipAmt = 0;
  const finalAmt = priceAmt + shipAmt;
  const rating = hit.review?.rate ?? hit.seller?.review?.rate ?? 4;
  const reviewCount = hit.review?.count ?? hit.seller?.review?.count ?? 0;
  const isPMall = !!hit.seller?.isPMallSeller;
  const auth = Math.min(95, 60 + Math.round(Math.log10(Math.max(1, reviewCount)) * 10) + (isPMall ? 15 : 0));
  return {
    id: 'yahoojp_' + hit.code,
    name: hit.name || '(no title)',
    store: 'YahooJP',
    country: 'JP',
    price: { amount: priceAmt, currency: 'JPY' },
    finalPrice: { amount: finalAmt, currency: 'JPY' },
    shippingFee: { amount: shipAmt, currency: 'JPY' },
    shipDays: 4,
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    authenticityPct: auth,
    official: isPMall,
    discountPct: 0,
    imageUrl: hit.image?.medium ?? hit.image?.small ?? '',
    tag: isPMall ? 'genuine' : 'value',
    score: computeTonyScore({
      similarity: 90 - idx * 2,
      finalPrice: finalAmt,
      referencePrice: REF_PRICE,
      reviewCount,
      authenticityPct: auth,
    }),
    buyUrl: hit.affiliateUrl || hit.url || '#',
  };
}

async function searchReal(q: string, limit: number, signal?: AbortSignal): Promise<Product[]> {
  const appId = process.env.YAHOO_JP_APP_ID;
  if (!appId) return [];
  const params = new URLSearchParams({
    appid: appId,
    query: q,
    results: String(Math.min(limit, 50)),
  });
  const url = `${SEARCH_URL}?${params.toString()}`;
  const res = await fetch(url, { signal, next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = (await res.json()) as YahooEnvelope;
  const hits = data.hits ?? [];
  return hits.slice(0, limit).map(toProduct);
}

export const yahooJpAdapter: SearchAdapter = {
  id: 'YahooJP',
  isEnabled: () => true,
  async search({ q, limit = 4, signal }: SearchInput) {
    const mode = ADAPTER_MODE.yahoojp();
    if (mode.real) {
      try {
        const real = await searchReal(q, limit, signal);
        if (real.length > 0) return real;
      } catch {
        /* fall through to mock */
      }
    }
    return generateMockProducts(
      { store: 'YahooJP', priceMul: 1.02, latencyMs: 280, country: 'JP', officialRate: 0.5, shipBase: 0 },
      q,
      limit,
      signal,
    );
  },
};
