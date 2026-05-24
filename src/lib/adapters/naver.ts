/**
 * Naver Shopping Search API adapter.
 *
 * Docs: https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 *   GET https://openapi.naver.com/v1/search/shop.json?query=...&display=...&sort=...
 *   Headers: X-Naver-Client-Id, X-Naver-Client-Secret
 *
 * Free tier: 25,000 req/day.
 * Falls back to deterministic mock when NAVER_CLIENT_ID/SECRET aren't set.
 */
import 'server-only';
import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';
import { ADAPTER_MODE } from '@/lib/env';
import { computeTonyScore } from '@/lib/scoring';
import type { Product } from '@/types/product';

const SEARCH_URL = 'https://openapi.naver.com/v1/search/shop.json';

interface NaverItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
}

function stripTags(s: string): string {
  return s.replace(/<\/?b>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}

function toProduct(item: NaverItem, idx: number): Product {
  const priceAmt = Number(item.lprice) || 0;
  // Naver Shopping doesn't expose shipping fees uniformly; assume 0 ("free shipping" is common
  // for hits ranked by sort=sim). Phase 8 will scrape product page when affiliates land.
  const shipAmt = 0;
  const final = priceAmt + shipAmt;
  // Naver doesn't give a rating in this endpoint either — approximate from brand presence.
  const hasBrand = !!item.brand;
  const score = computeTonyScore({
    similarity: 92 - idx * 2,
    finalPrice: final,
    referencePrice: 40000,
    reviewCount: hasBrand ? 600 : 120,
    authenticityPct: hasBrand ? 85 : 65,
  });

  return {
    id: 'naver_' + item.productId,
    name: stripTags(item.title),
    store: 'NaverShopping',
    country: 'KR',
    price: { amount: priceAmt, currency: 'KRW' },
    finalPrice: { amount: final, currency: 'KRW' },
    shippingFee: { amount: shipAmt, currency: 'KRW' },
    shipDays: 2,
    rating: hasBrand ? 4.5 : 4.1,
    reviewCount: hasBrand ? 600 : 120,
    authenticityPct: hasBrand ? 85 : 65,
    official: hasBrand,
    discountPct: 0,
    imageUrl: item.image,
    tag: 'value',
    score,
    buyUrl: item.link,
  };
}

async function searchReal(q: string, limit: number, signal?: AbortSignal): Promise<Product[]> {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) return [];

  const url = `${SEARCH_URL}?query=${encodeURIComponent(q)}&display=${Math.min(limit, 100)}&sort=sim`;
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': id,
      'X-Naver-Client-Secret': secret,
      Accept: 'application/json',
    },
    signal,
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: NaverItem[] };
  return (data.items ?? []).slice(0, limit).map(toProduct);
}

export const naverAdapter: SearchAdapter = {
  id: 'NaverShopping',
  isEnabled: () => true,
  async search({ q, limit = 4, signal }: SearchInput) {
    const mode = ADAPTER_MODE.naver();
    if (mode.real) {
      try {
        const real = await searchReal(q, limit, signal);
        if (real.length > 0) return real;
      } catch {
        /* fall through */
      }
    }
    return generateMockProducts(
      { store: 'NaverShopping', priceMul: 1.0, latencyMs: 160, country: 'KR', officialRate: 0.4, shipBase: 0 },
      q,
      limit,
      signal,
    );
  },
};
