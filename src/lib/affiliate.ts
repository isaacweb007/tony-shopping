/**
 * Affiliate URL tagging.
 *
 * Tony is a meta-shopping agent — we don't sell. Our revenue comes from
 * affiliate commissions on the user's outbound click. This module rewrites the
 * raw merchant URL to include our partner / associate / tracking ID per store
 * when one is configured in the environment.
 *
 * Rules:
 *  - Pure function; safe to call on every product render.
 *  - When no tag is configured for a store, return the URL untouched.
 *  - Don't fail loudly on malformed URLs — return the original.
 */
import type { StoreId } from '@/types/product';

/**
 * Add or replace a query-string param without losing existing ones.
 */
function withParam(url: string, key: string, value: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    return url;
  }
}

interface TagInput {
  store: StoreId;
  url: string;
}

/**
 * Server-side or client-side: rewrites a product URL with the right affiliate
 * tag for its store, picking the env variable that matches the merchant.
 *
 * NOTE: only NEXT_PUBLIC_* env vars work on the client. We expose the
 * affiliate tags publicly because they're already attached to outbound URLs
 * the user can read anyway.
 */
export function affiliateUrl({ store, url }: TagInput): string {
  if (!url || url === '#') return url;

  switch (store) {
    case 'Amazon': {
      const tag = process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG;
      return tag ? withParam(url, 'tag', tag) : url;
    }
    case 'Coupang': {
      const sub = process.env.NEXT_PUBLIC_COUPANG_SUBID;
      return sub ? withParam(url, 'subid', sub) : url;
    }
    case 'AliExpress': {
      const aff = process.env.NEXT_PUBLIC_ALIEXPRESS_AFF_ID;
      return aff ? withParam(url, 'aff_fcid', aff) : url;
    }
    case 'eBay': {
      const camp = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID;
      // eBay Partner Network rewrap is a separate domain redirect; we just
      // attach the campid for now and let analytics resolve it. A full EPN
      // rover.ebay link would happen server-side in the adapter.
      return camp ? withParam(url, 'campid', camp) : url;
    }
    case 'Shopee':
    case 'Lazada':
    case 'NaverShopping':
    case 'GoogleShopping':
    case 'Gmarket':
    case '11st':
    case 'TikTokShop':
    default:
      return url;
  }
}
