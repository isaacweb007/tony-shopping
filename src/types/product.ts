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

export interface Product {
  id: string;
  name: string;
  store: StoreId;
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
