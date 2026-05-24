/**
 * Amazon Product Advertising API 5.0 — SearchItems adapter.
 *
 * Endpoint: POST https://webservices.amazon.com/paapi5/searchitems
 *
 * Auth: AWS Signature V4. The associate program ties the partner tag to a
 * marketplace (US default here). Requests fail with "TooManyRequests" or
 * "InternalFailure" until the account earns a qualifying sale, so the adapter
 * falls back to mock data whenever a real call returns no items.
 *
 * Env needed:
 *   AMAZON_ACCESS_KEY
 *   AMAZON_SECRET_KEY
 *   AMAZON_PARTNER_TAG
 *   AMAZON_HOST          (default: webservices.amazon.com)
 *   AMAZON_REGION        (default: us-east-1)
 *   AMAZON_MARKETPLACE   (default: www.amazon.com)
 */
import 'server-only';
import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';
import { ADAPTER_MODE } from '@/lib/env';
import { sign } from '@/lib/sigv4';
import { computeTonyScore } from '@/lib/scoring';
import type { Product, Money } from '@/types/product';

interface PAAPIItem {
  ASIN?: string;
  DetailPageURL?: string;
  Images?: { Primary?: { Large?: { URL?: string } } };
  ItemInfo?: { Title?: { DisplayValue?: string } };
  Offers?: {
    Listings?: Array<{
      Price?: { Amount?: number; DisplayAmount?: string; Currency?: string };
      DeliveryInfo?: { IsAmazonFulfilled?: boolean; IsPrimeEligible?: boolean };
    }>;
  };
  CustomerReviews?: { Count?: number; StarRating?: { Value?: number } };
}

interface PAAPIResponse {
  SearchResult?: { Items?: PAAPIItem[] };
  Errors?: Array<{ Code?: string; Message?: string }>;
}

const HOST = process.env.AMAZON_HOST || 'webservices.amazon.com';
const REGION = process.env.AMAZON_REGION || 'us-east-1';
const MARKETPLACE = process.env.AMAZON_MARKETPLACE || 'www.amazon.com';
const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';
const TARGET = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';

function toProduct(item: PAAPIItem, idx: number): Product | null {
  const asin = item.ASIN;
  const title = item.ItemInfo?.Title?.DisplayValue;
  const listing = item.Offers?.Listings?.[0];
  const priceAmt = listing?.Price?.Amount ?? 0;
  const currency = (listing?.Price?.Currency ?? 'USD') as Money['currency'];
  if (!asin || !title || priceAmt <= 0) return null;

  const reviewCount = item.CustomerReviews?.Count ?? 0;
  const star = item.CustomerReviews?.StarRating?.Value ?? 4.2;
  const isPrime = !!listing?.DeliveryInfo?.IsPrimeEligible;

  // Amazon offers don't expose shipping fee directly in this endpoint —
  // assume free for Prime / Amazon-fulfilled, 0 otherwise (real shipping
  // surfaces at the cart step).
  const ship: Money = { amount: 0, currency };
  const final: Money = { amount: priceAmt, currency };

  const score = computeTonyScore({
    similarity: 90 - idx * 2,
    finalPrice: priceAmt,
    referencePrice: 50,
    reviewCount,
    authenticityPct: isPrime ? 92 : 80,
  });

  return {
    id: 'amzn_' + asin,
    name: title,
    store: 'Amazon',
    country: 'US',
    price: { amount: priceAmt, currency },
    finalPrice: final,
    shippingFee: ship,
    shipDays: isPrime ? 2 : 5,
    rating: Math.round(star * 10) / 10,
    reviewCount,
    authenticityPct: isPrime ? 92 : 80,
    official: isPrime,
    discountPct: 0,
    imageUrl: item.Images?.Primary?.Large?.URL ?? '',
    tag: 'value',
    score,
    buyUrl: item.DetailPageURL ?? `https://${HOST.replace('webservices', 'www')}/dp/${asin}`,
  };
}

async function searchReal(q: string, limit: number, signal?: AbortSignal): Promise<Product[]> {
  const access = process.env.AMAZON_ACCESS_KEY;
  const secret = process.env.AMAZON_SECRET_KEY;
  const partner = process.env.AMAZON_PARTNER_TAG;
  if (!access || !secret || !partner) return [];

  const body = JSON.stringify({
    Keywords: q,
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'Offers.Listings.Price',
      'Offers.Listings.DeliveryInfo.IsPrimeEligible',
      'Offers.Listings.DeliveryInfo.IsAmazonFulfilled',
      'CustomerReviews.Count',
      'CustomerReviews.StarRating',
    ],
    PartnerTag: partner,
    PartnerType: 'Associates',
    Marketplace: MARKETPLACE,
    ItemCount: Math.min(limit, 10),
  });

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Encoding': 'amz-1.0',
    'X-Amz-Target': TARGET,
  };

  const signed = sign({
    method: 'POST',
    host: HOST,
    path: PATH,
    headers: baseHeaders,
    body,
    region: REGION,
    service: SERVICE,
    accessKey: access,
    secretKey: secret,
  });

  let res: Response;
  try {
    res = await fetch(`https://${HOST}${PATH}`, {
      method: 'POST',
      headers: signed.headers,
      body,
      signal,
      cache: 'no-store',
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as PAAPIResponse | null;
  const items = data?.SearchResult?.Items ?? [];
  return items
    .slice(0, limit)
    .map((it, i) => toProduct(it, i))
    .filter((p): p is Product => p !== null);
}

export const amazonAdapter: SearchAdapter = {
  id: 'Amazon',
  isEnabled: () => true,
  async search({ q, limit = 4, signal }: SearchInput) {
    const mode = ADAPTER_MODE.amazon();
    if (mode.real) {
      try {
        const real = await searchReal(q, limit, signal);
        if (real.length > 0) return real;
      } catch {
        /* fall through */
      }
    }
    return generateMockProducts(
      { store: 'Amazon', priceMul: 0.95, latencyMs: 260, country: 'US', officialRate: 0.55, shipBase: 3500 },
      q,
      limit,
      signal,
    );
  },
};
