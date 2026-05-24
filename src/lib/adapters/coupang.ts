/**
 * Coupang Partners Open API adapter.
 *
 * Docs (Korean): https://partners.coupang.com/#help/open-api/v2
 * Endpoint: GET https://api-gateway.coupang.com{path}
 *
 * Auth: HMAC-SHA256 over (signedDate + method + path + canonicalQuery)
 *   Authorization: CEA algorithm=HmacSHA256, access-key=..., signed-date=..., signature=...
 *
 * signedDate format: yyMMddTHHmmssZ
 *
 * Free until first sale generated; falls back to mock when ACCESS/SECRET
 * aren't set or the response is empty.
 */
import 'server-only';
import { createHmac } from 'node:crypto';
import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';
import { ADAPTER_MODE } from '@/lib/env';
import { computeTonyScore } from '@/lib/scoring';
import type { Product, Money } from '@/types/product';

const HOST = 'https://api-gateway.coupang.com';
const PATH_BASE = '/v2/providers/affiliate_open_api/apis/openapi/v1/products/search';

interface CoupangProduct {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  isRocket?: boolean;
  isFreeShipping?: boolean;
  categoryName?: string;
}

interface CoupangResponse {
  rCode?: string;
  rMessage?: string;
  data?: {
    productData?: CoupangProduct[];
  };
}

function signedDate(d = new Date()): string {
  // yyMMddTHHmmssZ in GMT
  const iso = d.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) + 'T' + iso.slice(11, 13) + iso.slice(14, 16) + iso.slice(17, 19) + 'Z';
}

function buildAuthHeader(
  method: 'GET' | 'POST',
  pathWithQuery: string,
  accessKey: string,
  secretKey: string,
): string {
  const [path, query = ''] = pathWithQuery.split('?');
  const date = signedDate();
  const message = date + method + path + query;
  const signature = createHmac('sha256', secretKey).update(message).digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${date}, signature=${signature}`;
}

function toProduct(item: CoupangProduct, idx: number): Product {
  const priceAmt = item.productPrice;
  const ship: Money = { amount: 0, currency: 'KRW' };
  const final: Money = { amount: priceAmt, currency: 'KRW' };
  const isRocket = !!item.isRocket;
  // Coupang search doesn't include rating; use heuristic from Rocket badge.
  const reviewCount = isRocket ? 500 : 80;
  const score = computeTonyScore({
    similarity: 92 - idx * 2,
    finalPrice: priceAmt,
    referencePrice: 40000,
    reviewCount,
    authenticityPct: isRocket ? 90 : 70,
  });
  return {
    id: 'coupang_' + item.productId,
    name: item.productName,
    store: 'Coupang',
    country: 'KR',
    price: { amount: priceAmt, currency: 'KRW' },
    finalPrice: final,
    shippingFee: ship,
    shipDays: isRocket ? 1 : 3,
    rating: isRocket ? 4.6 : 4.2,
    reviewCount,
    authenticityPct: isRocket ? 90 : 70,
    official: isRocket,
    discountPct: 0,
    imageUrl: item.productImage,
    tag: 'value',
    score,
    buyUrl: item.productUrl,
  };
}

async function searchReal(q: string, limit: number, signal?: AbortSignal): Promise<Product[]> {
  const access = process.env.COUPANG_ACCESS_KEY;
  const secret = process.env.COUPANG_SECRET_KEY;
  if (!access || !secret) return [];

  const query = new URLSearchParams({ keyword: q, limit: String(Math.min(limit, 50)) }).toString();
  const pathWithQuery = `${PATH_BASE}?${query}`;
  const auth = buildAuthHeader('GET', pathWithQuery, access, secret);

  let res: Response;
  try {
    res = await fetch(`${HOST}${pathWithQuery}`, {
      method: 'GET',
      headers: { Authorization: auth, Accept: 'application/json' },
      signal,
      cache: 'no-store',
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as CoupangResponse | null;
  const items = data?.data?.productData ?? [];
  return items.slice(0, limit).map(toProduct);
}

export const coupangAdapter: SearchAdapter = {
  id: 'Coupang',
  isEnabled: () => true,
  async search({ q, limit = 4, signal }: SearchInput) {
    const mode = ADAPTER_MODE.coupang();
    if (mode.real) {
      try {
        const real = await searchReal(q, limit, signal);
        if (real.length > 0) return real;
      } catch {
        /* fall through */
      }
    }
    return generateMockProducts(
      { store: 'Coupang', priceMul: 1.05, latencyMs: 180, country: 'KR', officialRate: 0.45, shipBase: 0 },
      q,
      limit,
      signal,
    );
  },
};
