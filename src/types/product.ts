/**
 * Tony Shopping — core domain types.
 *
 * Phase 2 is mock-only; in Phase 4 these shapes back the real
 * adapter responses (Coupang/Amazon/Shopee/Lazada/Naver/etc.).
 */

export type StoreId =
  | 'Coupang'
  | 'Amazon'
  | 'eBay'
  | 'Shopee'
  | 'Lazada'
  | 'NaverShopping'
  | 'AliExpress'
  | 'Gmarket'
  | '11st'
  | 'TikTokShop'
  | 'GoogleShopping'
  | 'Rakuten'
  | 'YahooJP';

export type CountryCode = 'KR' | 'VN' | 'US' | 'JP' | 'TH' | 'MY' | 'SG';

/** Currency stored in *minor units* (e.g. KRW won are integers — there's no minor unit, but we keep integer). */
export interface Money {
  amount: number;
  currency: 'KRW' | 'USD' | 'VND' | 'JPY';
}

/** Tony recommendation tag — used to color/badge cards. */
export type TonyTag = 'best' | 'cheap' | 'fast' | 'genuine' | 'value' | 'alt' | 'not';

/** Tony score is 0..100; weights are documented in lib/scoring.ts (Phase 2.1). */
export interface TonyScore {
  total: number;          // 0..100
  similarity: number;     // 0..100
  priceEdge: number;      // 0..100 (higher = cheaper relative to set)
  reviewTrust: number;    // 0..100
  authenticity: number;   // 0..100
}

/**
 * One sibling listing of the same product from a different merchant.
 *
 * When the search aggregator clusters results (e.g. SerpAPI returns "Apple
 * AirPods Pro 2" from KREAM, 쿠팡, 11번가 and Apple at different prices),
 * the canonical Product keeps the best (highest-score) listing and the
 * other merchants are attached as MerchantOffer[]. UI renders them as a
 * compact "available at" rail so users see real cross-mall comparison.
 */
export interface MerchantOffer {
  /** Display label for the merchant (e.g. "쿠팡", "KREAM", "11번가"). */
  merchantName: string;
  /** Canonical StoreId for affiliate routing. */
  store: StoreId;
  /** Final price as shown to the user (includes shipping). */
  price: Money;
  /** Estimated delivery in days. 0 = today, 1 = tomorrow. */
  shipDays: number;
  /** Outbound product URL (affiliate-wrapped at click time). */
  buyUrl: string;
}

export interface Product {
  id: string;
  name: string;
  store: StoreId;
  /**
   * Adapter-supplied human-readable merchant name (e.g. "KREAM", "11번가",
   * "Walmart"). When present, UI prefers this over the StoreId-derived label
   * — it surfaces the actual storefront behind a meta-search result.
   */
  merchantName?: string;
  /** Country the listing ships from. */
  country: CountryCode;
  /** Itself, in displayed currency. */
  price: Money;
  /** Final price = price + shipping fee (in same currency). */
  finalPrice: Money;
  shippingFee: Money;
  /** Estimated delivery in days. 0 = today, 1 = tomorrow, 14 = within 14d. */
  shipDays: number;
  rating: number;       // 0..5
  reviewCount: number;
  /** Probability (%) that this listing is authentic / official. */
  authenticityPct: number;
  /** Is this listed by the official brand store. */
  official: boolean;
  /** Discount percent off original price; 0 if none. */
  discountPct: number;
  imageUrl: string;
  /** Tony's primary tag for this product in the current search. */
  tag: TonyTag;
  score: TonyScore;
  /** External buy URL (Phase 4 fills with affiliate-tagged URL). */
  buyUrl: string;
  /**
   * Optional sample of real review text. Adapters fill this when their API
   * returns review bodies (Phase H+ on supported merchants); mock adapters
   * generate a deterministic mix of genuine and bot-like patterns. Used by
   * Tony's LLM review summariser.
   */
  reviewSamples?: string[];
  /**
   * Sibling listings of the same product from other merchants, populated by
   * the post-aggregation clusterer in lib/search/cluster.ts. Sorted by
   * price ascending. Empty/undefined when the product is unique in the
   * result set.
   */
  offers?: MerchantOffer[];
}

export interface TonyReport {
  total: number;
  highlySimilar: number;
  similar: number;
  avgTony: number;
  avgAuthenticity: number;
  cheapest: Product;
  fastest: Product;
  best: Product;
}
