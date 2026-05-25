/**
 * SerpAPI Google Shopping adapter — meta-search source.
 *
 * Why this exists: as a meta-shopping agent we want a broad view across many
 * storefronts at once. SerpAPI exposes Google Shopping results legally with a
 * single key — one call returns 30+ merchants (Amazon, Walmart, eBay, Target,
 * Best Buy, Coupang, Naver, etc.).
 *
 * Endpoint: GET https://serpapi.com/search.json?engine=google_shopping&q=...&api_key=...
 * Free tier: 100 searches/month (sufficient for an MVP).
 */
import 'server-only';
import type { SearchAdapter, SearchInput } from './base';
import { generateMockProducts } from './mock-factory';
import { ADAPTER_MODE } from '@/lib/env';
import { computeTonyScore } from '@/lib/scoring';
import type { Product, Money, StoreId } from '@/types/product';

const ENDPOINT = 'https://serpapi.com/search.json';

interface SerpShoppingItem {
  position?: number;
  title?: string;
  link?: string;
  product_link?: string;
  product_id?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  delivery?: string;
  badge?: string;
  tag?: string;
}

interface SerpResponse {
  shopping_results?: SerpShoppingItem[];
  error?: string;
}

/** Map known merchant strings into our canonical StoreId; default to GoogleShopping. */
function mapSource(source?: string): StoreId {
  if (!source) return 'GoogleShopping';
  const s = source.toLowerCase();
  if (s.includes('amazon')) return 'Amazon';
  if (s.includes('ebay')) return 'eBay';
  if (s.includes('coupang')) return 'Coupang';
  if (s.includes('shopee')) return 'Shopee';
  if (s.includes('lazada')) return 'Lazada';
  if (s.includes('naver')) return 'NaverShopping';
  if (s.includes('aliexpress')) return 'AliExpress';
  if (s.includes('11st') || s.includes('11번가')) return '11st';
  if (s.includes('gmarket') || s.includes('g마켓')) return 'Gmarket';
  if (s.includes('tiktok')) return 'TikTokShop';
  return 'GoogleShopping';
}

function parseDeliveryDays(delivery?: string): number {
  if (!delivery) return 5;
  const lower = delivery.toLowerCase();
  if (lower.includes('today') || lower.includes('오늘')) return 0;
  if (lower.includes('tomorrow') || lower.includes('내일')) return 1;
  const m = lower.match(/(\d+)(\+)?\s*(day|일)/);
  if (m && m[1]) return parseInt(m[1]!, 10);
  if (lower.includes('free shipping')) return 3;
  return 5;
}

function toProduct(item: SerpShoppingItem, idx: number): Product | null {
  const price = item.extracted_price;
  if (!price || price <= 0 || !item.title) return null;
  const store = mapSource(item.source);
  const shipDays = parseDeliveryDays(item.delivery);
  const reviewCount = item.reviews ?? 0;
  const rating = item.rating ?? 4.2;
  const trustedBadge = !!(item.badge?.toLowerCase().includes('trusted') || item.tag);
  const authPct = trustedBadge ? 88 : 72;

  // SerpAPI returns prices in the search locale's currency; default to USD.
  const currency: Money['currency'] = 'USD';
  const finalAmt = price;

  const score = computeTonyScore({
    similarity: 92 - idx * 2,
    finalPrice: finalAmt,
    referencePrice: 50,
    reviewCount,
    authenticityPct: authPct,
  });

  return {
    id: 'serp_' + (item.product_id ?? `${idx}_${Date.now()}`),
    name: item.title,
    store,
    country: 'US',
    price: { amount: price, currency },
    finalPrice: { amount: finalAmt, currency },
    shippingFee: { amount: 0, currency },
    shipDays,
    rating: Math.round(rating * 10) / 10,
    reviewCount,
    authenticityPct: authPct,
    official: trustedBadge,
    discountPct: 0,
    imageUrl: item.thumbnail ?? '',
    tag: 'value',
    score,
    buyUrl: item.product_link ?? item.link ?? '#',
  };
}

/**
 * Locale → SerpAPI search params.
 *
 *   gl  — country code Google should search from (kr / us / vn).
 *   hl  — language of the result page.
 *   google_domain — which Google TLD to query, e.g. google.co.kr.
 *   location — broad geolocation label that improves merchant coverage.
 *
 * The result: a KO user searches and sees Naver/Coupang/G마켓/11번가 mixed
 * in alongside Amazon/eBay rather than a US-default Walmart/Target dump.
 */
const LOCALE_PARAMS: Record<
  'ko' | 'en' | 'vi',
  { gl: string; hl: string; google_domain: string; location: string }
> = {
  ko: { gl: 'kr', hl: 'ko', google_domain: 'google.co.kr', location: 'Seoul, South Korea' },
  en: { gl: 'us', hl: 'en', google_domain: 'google.com', location: 'United States' },
  vi: { gl: 'vn', hl: 'vi', google_domain: 'google.com.vn', location: 'Ho Chi Minh City, Vietnam' },
};

async function searchReal(
  q: string,
  limit: number,
  locale: 'ko' | 'en' | 'vi' = 'ko',
  signal?: AbortSignal,
): Promise<Product[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];

  const loc = LOCALE_PARAMS[locale];
  const params = new URLSearchParams({
    engine: 'google_shopping',
    q,
    num: String(Math.min(limit * 2, 40)),
    api_key: key,
    gl: loc.gl,
    hl: loc.hl,
    google_domain: loc.google_domain,
    location: loc.location,
    device: 'desktop',
  });

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as SerpResponse | null;
  const items = data?.shopping_results ?? [];
  return items
    .slice(0, limit)
    .map((it, i) => toProduct(it, i))
    .filter((p): p is Product => p !== null);
}

export const serpapiAdapter: SearchAdapter = {
  id: 'GoogleShopping',
  isEnabled: () => true,
  async search({ q, limit = 6, locale = 'ko', signal }: SearchInput) {
    const mode = ADAPTER_MODE.serpapi();
    if (mode.real) {
      try {
        const real = await searchReal(q, limit, locale, signal);
        if (real.length > 0) return real;
      } catch {
        /* fall through */
      }
    }
    // Mock fallback uses a generic profile; UI badge will show GoogleShopping.
    return generateMockProducts(
      { store: 'GoogleShopping', priceMul: 0.9, latencyMs: 200, country: 'US', officialRate: 0.5, shipBase: 0 },
      q,
      limit,
      signal,
    );
  },
};
