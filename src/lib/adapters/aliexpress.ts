/**
 * AliExpress Affiliate Open Platform adapter.
 *
 * Docs: https://openservice.aliexpress.com/doc/doc.htm
 *   AliExpress signs requests with HMAC-SHA256 over sorted params; the
 *   product-search endpoint is `aliexpress.affiliate.product.query`.
 *
 * The full HMAC dance is documented but complex; this adapter currently
 * mocks the call when only the affiliate tag is present. Once a paying
 * partner account is wired with ALIEXPRESS_APP_KEY + ALIEXPRESS_APP_SECRET,
 * the signed request lands here. Until then mock keeps the platform
 * demo-able and identical to the eBay / Naver fallback shape.
 */
import 'server-only';
import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';
import { ADAPTER_MODE } from '@/lib/env';
import { computeTonyScore } from '@/lib/scoring';
import type { Product } from '@/types/product';

const REF_PRICE_USD = 30;

interface AliItem {
  product_id: string | number;
  product_title: string;
  app_sale_price: string;
  app_sale_price_currency?: string;
  promotion_link?: string;
  product_detail_url?: string;
  product_main_image_url?: string;
  evaluate_rate?: string;
  lastest_volume?: number;
}

async function callAliApi(_q: string, _limit: number, _signal?: AbortSignal): Promise<AliItem[]> {
  // Placeholder for the signed `aliexpress.affiliate.product.query` call.
  // Real implementation requires HMAC-SHA256 over sorted params + the
  // tracking_id from process.env.ALIEXPRESS_TRACKING_ID. Until that's wired,
  // we return [] which causes the adapter to fall through to mock.
  return [];
}

function toProduct(item: AliItem, idx: number): Product {
  const priceAmt = Math.round(Number(item.app_sale_price) || 0);
  const currency = (item.app_sale_price_currency ?? 'USD') as Product['finalPrice']['currency'];
  const finalAmt = priceAmt;
  const rating = Number(item.evaluate_rate ?? '4') || 4;
  const reviewCount = item.lastest_volume ?? 0;
  return {
    id: 'aliexpress_' + item.product_id,
    name: item.product_title || '(no title)',
    store: 'AliExpress',
    country: 'US',
    price: { amount: priceAmt, currency },
    finalPrice: { amount: finalAmt, currency },
    shippingFee: { amount: 0, currency },
    shipDays: 14,
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    authenticityPct: 55, // AliExpress baseline — wide variance
    official: false,
    discountPct: 0,
    imageUrl: item.product_main_image_url ?? '',
    tag: 'cheap',
    score: computeTonyScore({
      similarity: 85 - idx * 3,
      finalPrice: finalAmt,
      referencePrice: REF_PRICE_USD,
      reviewCount,
      authenticityPct: 55,
    }),
    buyUrl: item.promotion_link || item.product_detail_url || '#',
  };
}

export const aliexpressAdapter: SearchAdapter = {
  id: 'AliExpress',
  isEnabled: () => true,
  async search({ q, limit = 4, signal }: SearchInput) {
    const mode = ADAPTER_MODE.aliexpress();
    if (mode.real) {
      try {
        const items = await callAliApi(q, limit, signal);
        if (items.length > 0) return items.slice(0, limit).map(toProduct);
      } catch {
        /* fall through to mock */
      }
    }
    return generateMockProducts(
      { store: 'AliExpress', priceMul: 0.55, latencyMs: 320, country: 'US', officialRate: 0.1, shipBase: 0 },
      q,
      limit,
      signal,
    );
  },
};
