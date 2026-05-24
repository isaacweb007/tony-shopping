'use client';

/**
 * FX rate cache for converting any merchant currency into the user's locale
 * currency on the fly.
 *
 * Strategy:
 *  - Source: https://api.frankfurter.dev (free, no key, daily ECB rates)
 *  - Cache: a single-base rate table (KRW base) kept in memory + localStorage
 *           for 12 hours.
 *  - Failure modes always degrade gracefully — when conversion fails the UI
 *    just shows the original currency.
 *
 * Phase 5 will move this to a server-cached edge function so all clients
 * share the same rates.
 */
import type { AppLocale } from '@/i18n/routing';
import type { Money } from '@/types/product';

const CACHE_KEY = 'tony.fx.v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const BASE: Money['currency'] = 'KRW';

interface FxCache {
  base: Money['currency'];
  /** 1 unit of `base` is worth this many units of target. */
  rates: Partial<Record<Money['currency'], number>>;
  fetchedAt: number;
}

const LOCALE_CURRENCY: Record<AppLocale, Money['currency']> = {
  ko: 'KRW',
  en: 'USD',
  vi: 'VND',
};

let inMemory: FxCache | null = null;
let inflight: Promise<FxCache | null> | null = null;

function loadCache(): FxCache | null {
  if (inMemory) return inMemory;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FxCache;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    inMemory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(cache: FxCache) {
  inMemory = cache;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota — ignore */
  }
}

async function refresh(): Promise<FxCache | null> {
  // Frankfurter returns base=KRW, returns rates for USD/VND/JPY (we ignore the rest).
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${BASE}&symbols=USD,VND,JPY,KRW`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: Record<string, number> };
    if (!json.rates) return null;
    const cache: FxCache = {
      base: BASE,
      rates: {
        KRW: 1,
        USD: json.rates['USD'],
        VND: json.rates['VND'],
        JPY: json.rates['JPY'],
      },
      fetchedAt: Date.now(),
    };
    saveCache(cache);
    return cache;
  } catch {
    return null;
  }
}

/** Eagerly fetch the rate table (idempotent). */
export function preloadFx(): Promise<FxCache | null> {
  const cached = loadCache();
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = refresh().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Synchronous best-effort conversion. Returns the input untouched on cache miss. */
export function convertMoneySync(money: Money, to: Money['currency']): Money {
  if (money.currency === to) return money;
  const cache = inMemory ?? loadCache();
  if (!cache) {
    void preloadFx(); // warm for next render
    return money;
  }
  const fromRate = money.currency === cache.base ? 1 : cache.rates[money.currency];
  const toRate = to === cache.base ? 1 : cache.rates[to];
  if (!fromRate || !toRate) return money;
  // amount (in `from`) → base via /fromRate → target via *toRate
  const inBase = money.amount / fromRate;
  const converted = inBase * toRate;
  return { amount: Math.round(converted), currency: to };
}

/** Currency that the user's locale prefers. */
export function localeCurrency(locale: AppLocale): Money['currency'] {
  return LOCALE_CURRENCY[locale];
}
