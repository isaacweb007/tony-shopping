/**
 * Rakuten Ichiba Item Search API adapter (Japan).
 *
 * Docs: https://webservice.rakuten.co.jp/documentation/ichiba-item-search
 *   GET https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601
 *       ?applicationId=...&keyword=...&hits=...&formatVersion=2
 *
 * Free tier: 1 req/sec, no daily cap (anti-abuse only).
 * Falls back to deterministic mock when RAKUTEN_APP_ID isn't set.
 */
import 'server-only';
import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';
import { ADAPTER_MODE } from '@/lib/env';
import { computeTonyScore } from '@/lib/scoring';
import type { Product } from '@/types/product';

const SEARCH_URL = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601';
const REF_PRICE = 4000; // JPY reference

interface RakutenItem {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  affiliateUrl?: string;
  shopName: string;
  reviewCount: number;
  reviewAverage: number;
  mediumImageUrls?: Array<string | { imageUrl: string }>;
  postageFlag?: number; // 0 = postage included, 1 = excluded
  taxFlag?: number;
}

function pickImage(item: RakutenItem): string {
  const first = item.mediumImageUrls?.[0];
  if (!first) return '';
  if (typeof first === 'string') return first;
  return first.imageUrl;
}

function toProduct(item: RakutenItem, idx: number): Product {
  const priceAmt = Math.round(item.itemPrice) || 0;
  // Rakuten typically bakes shipping into postageFlag=0; we surface a rough
  // 500 JPY when shipping is on top.
  const shipAmt = item.postageFlag === 1 ? 500 : 0;
  const finalAmt = priceAmt + shipAmt;
  const rating = Number.isFinite(item.reviewAverage) ? Number(item.reviewAverage) : 4;
  const reviewCount = Number.isFinite(item.reviewCount) ? Math.round(item.reviewCount) : 0;
  // Rakuten doesn't expose an authenticity signal directly. Use review volume
  // + the official-shop heuristic (shopName endings like "公式" / "official").
  const looksOfficial = /公式|オフィシャル|official/i.test(item.shopName);
  const auth = Math.min(95, 60 + Math.round(Math.log10(Math.max(1, reviewCount)) * 10) + (looksOfficial ? 10 : 0));

  return {
    id: 'rakuten_' + item.itemCode,
    name: item.itemName || '(no title)',
    store: 'Rakuten',
    country: 'JP',
    price: { amount: priceAmt, currency: 'JPY' },
    finalPrice: { amount: finalAmt, currency: 'JPY' },
    shippingFee: { amount: shipAmt, currency: 'JPY' },
    shipDays: 4,
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    authenticityPct: auth,
    official: looksOfficial,
    discountPct: 0,
    imageUrl: pickImage(item),
    tag: looksOfficial ? 'genuine' : 'value',
    score: computeTonyScore({
      similarity: 92 - idx * 2,
      finalPrice: finalAmt,
      referencePrice: REF_PRICE,
      reviewCount,
      authenticityPct: auth,
    }),
    buyUrl: item.affiliateUrl || item.itemUrl || '#',
  };
}

async function searchReal(q: string, limit: number, signal?: AbortSignal): Promise<Product[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) return [];
  const params = new URLSearchParams({
    applicationId: appId,
    keyword: q,
    hits: String(Math.min(limit, 30)),
    formatVersion: '2',
  });
  const affId = process.env.RAKUTEN_AFFILIATE_ID;
  if (affId) params.set('affiliateId', affId);
  const url = `${SEARCH_URL}?${params.toString()}`;
  const res = await fetch(url, {
    signal,
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { Items?: RakutenItem[] };
  const items = data.Items ?? [];
  return items.slice(0, limit).map(toProduct);
}

export const rakutenAdapter: SearchAdapter = {
  id: 'Rakuten',
  isEnabled: () => true,
  async search({ q, limit = 4, signal }: SearchInput) {
    const mode = ADAPTER_MODE.rakuten();
    if (mode.real) {
      try {
        const real = await searchReal(q, limit, signal);
        if (real.length > 0) return real;
      } catch {
        /* fall through to mock */
      }
    }
    return generateMockProducts(
      { store: 'Rakuten', priceMul: 1.05, latencyMs: 250, country: 'JP', officialRate: 0.55, shipBase: 0 },
      q,
      limit,
      signal,
    );
  },
};
