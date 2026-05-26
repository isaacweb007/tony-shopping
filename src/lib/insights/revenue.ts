/**
 * Revenue-potential estimator.
 *
 * Affiliate commission is paid per qualifying outbound click that converts.
 * Without server-side conversion telemetry we can only estimate: take the
 * per-store rate × an assumed assist value × the recent click count, then
 * dampen by an assumed conversion rate. The numbers below are public-
 * benchmark approximations — they're for "directional" insight, not
 * accounting.
 */
import type { ClickEvent } from '@/stores/click-store';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Per-store rough average commission rate (decimal). Sourced from publicly
 * disclosed affiliate program tiers; real numbers vary by category and
 * partner tier.
 */
const STORE_RATE: Record<string, number> = {
  Coupang: 0.03,        // ~3% on most categories
  Amazon: 0.04,         // 1-10% by category; midpoint
  eBay: 0.03,           // ~2-4%
  NaverShopping: 0.025,
  Shopee: 0.04,
  Lazada: 0.045,
  Rakuten: 0.025,
  YahooJP: 0.025,
  AliExpress: 0.06,
  GoogleShopping: 0.02, // SerpAPI-routed; informational only
};

/** Assumed assist value per click (KRW). Mid-range basket × low-bound. */
const ASSUMED_BASKET_KRW = 60_000;

/** Conversion rate we assume to dampen click→fee math. */
const CONVERSION_RATE = 0.05; // 5% of clicks convert

export interface RevenueEstimate {
  /** Total estimated commission in KRW. */
  totalKrw: number;
  /** Total clicks counted (last 30 days). */
  clicks: number;
  /** Per-store breakdown sorted by contribution desc. */
  perStore: Array<{ store: string; krw: number; clicks: number; rate: number }>;
}

interface BuildArgs {
  clicks: readonly ClickEvent[];
  now?: number;
}

export function buildRevenueEstimate({
  clicks,
  now = Date.now(),
}: BuildArgs): RevenueEstimate {
  const since = now - MONTH_MS;
  const recent = clicks.filter((c) => c.at >= since);
  const perStoreMap = new Map<string, { krw: number; clicks: number; rate: number }>();
  for (const c of recent) {
    const rate = STORE_RATE[c.store] ?? 0.02;
    const fee = ASSUMED_BASKET_KRW * rate * CONVERSION_RATE;
    const prior = perStoreMap.get(c.store) ?? { krw: 0, clicks: 0, rate };
    prior.krw += fee;
    prior.clicks += 1;
    perStoreMap.set(c.store, prior);
  }
  const perStore = [...perStoreMap.entries()]
    .map(([store, v]) => ({ store, krw: Math.round(v.krw), clicks: v.clicks, rate: v.rate }))
    .sort((a, b) => b.krw - a.krw);
  const totalKrw = perStore.reduce((s, x) => s + x.krw, 0);
  return { totalKrw, clicks: recent.length, perStore };
}
