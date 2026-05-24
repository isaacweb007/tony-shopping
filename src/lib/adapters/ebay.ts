/**
 * eBay Browse API adapter.
 *
 * Auth: OAuth 2.0 client_credentials (App access token).
 * Browse API:
 *   GET https://api.ebay.com/buy/browse/v1/item_summary/search?q=...&limit=...
 *
 * Without credentials the adapter returns deterministic mock products so the
 * platform stays demo-able. Add EBAY_CLIENT_ID + EBAY_CLIENT_SECRET to enable.
 */
import 'server-only';
import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';
import { ADAPTER_MODE } from '@/lib/env';
import { computeTonyScore } from '@/lib/scoring';
import type { Product, Money } from '@/types/product';

const OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const REF_PRICE = 40000; // KRW reference; replaced when currency conversion lands

// Module-level token cache (server-side, per Node process).
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string | null> {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope',
  });

  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    // Don't cache the token request itself.
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  image?: { imageUrl?: string };
  thumbnailImages?: Array<{ imageUrl: string }>;
  price?: { value?: string; currency?: string };
  shippingOptions?: Array<{
    shippingCost?: { value?: string; currency?: string };
    minEstimatedDeliveryDate?: string;
    maxEstimatedDeliveryDate?: string;
  }>;
  seller?: { feedbackPercentage?: string; feedbackScore?: number; username?: string };
  itemWebUrl?: string;
  topRatedBuyingExperience?: boolean;
  conditionId?: string;
  itemAffiliateWebUrl?: string;
}

function toProduct(item: EbayItemSummary, idx: number): Product {
  const priceAmt = Number(item.price?.value ?? '0') || 0;
  const shipAmt = Number(item.shippingOptions?.[0]?.shippingCost?.value ?? '0') || 0;
  const currency = (item.price?.currency ?? 'USD') as Money['currency'];

  // Crude ETA: difference between today and minEstimatedDeliveryDate in days.
  let shipDays = 7;
  const minEta = item.shippingOptions?.[0]?.minEstimatedDeliveryDate;
  if (minEta) {
    const diff = Math.round((new Date(minEta).getTime() - Date.now()) / 86_400_000);
    if (Number.isFinite(diff) && diff >= 0) shipDays = diff;
  }

  const feedbackPct = Number(item.seller?.feedbackPercentage ?? '90') || 90;
  const reviewCount = item.seller?.feedbackScore ?? 0;
  // eBay summary lacks a rating; approximate from feedbackPercentage.
  const rating = Math.min(5, Math.max(3.5, feedbackPct / 20));

  const finalAmt = priceAmt + shipAmt;
  const score = computeTonyScore({
    similarity: 90 - idx * 2,
    finalPrice: finalAmt,
    referencePrice: REF_PRICE / 1000, // eBay typically in USD; rough scale-down
    reviewCount,
    authenticityPct: item.topRatedBuyingExperience ? 95 : Math.round(feedbackPct),
  });

  return {
    id: 'ebay_' + item.itemId,
    name: item.title || '(no title)',
    store: 'eBay',
    country: 'US',
    price: { amount: priceAmt, currency },
    finalPrice: { amount: finalAmt, currency },
    shippingFee: { amount: shipAmt, currency },
    shipDays,
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    authenticityPct: Math.round(feedbackPct),
    official: !!item.topRatedBuyingExperience,
    discountPct: 0,
    imageUrl: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? '',
    tag: 'value',
    score,
    buyUrl: item.itemAffiliateWebUrl ?? item.itemWebUrl ?? '#',
  };
}

async function searchReal(q: string, limit: number, signal?: AbortSignal): Promise<Product[]> {
  const token = await getAppToken();
  if (!token) return [];

  const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&limit=${Math.min(limit, 50)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      Accept: 'application/json',
    },
    signal,
    // Cache search responses briefly for SWR.
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { itemSummaries?: EbayItemSummary[] };
  const items = data.itemSummaries ?? [];
  return items.slice(0, limit).map(toProduct);
}

export const ebayAdapter: SearchAdapter = {
  id: 'eBay',
  isEnabled: () => true,
  async search({ q, limit = 4, signal }: SearchInput) {
    const mode = ADAPTER_MODE.ebay();
    if (mode.real) {
      try {
        const real = await searchReal(q, limit, signal);
        if (real.length > 0) return real;
      } catch {
        /* fall through to mock */
      }
    }
    return generateMockProducts(
      { store: 'eBay', priceMul: 0.92, latencyMs: 280, country: 'US', officialRate: 0.4, shipBase: 4500 },
      q,
      limit,
      signal,
    );
  },
};
