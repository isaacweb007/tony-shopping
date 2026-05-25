/**
 * Pre-checkout guide engine — produces a short, localised checklist of
 * "things Tony wants you to know before you hit Buy". Pure, no React, no IO.
 *
 * Each ChecklistItem carries a stable i18n key under checkout.checks.{key}
 * (label + body templates live in messages/*.json), a severity that drives the
 * icon + colour, and any vars the template needs.
 */
import type { Product, CountryCode } from '@/types/product';
import type { AppLocale } from '@/i18n/routing';
import { convertMoneySync } from '@/lib/currency';

export type CheckSeverity = 'info' | 'caution' | 'warning';
export type CheckKey =
  | 'customsKR'
  | 'customsVN'
  | 'authenticityLow'
  | 'discountExpiry'
  | 'freeShip'
  | 'returnPolicy';

export interface ChecklistItem {
  key: CheckKey;
  severity: CheckSeverity;
  /** Variables to interpolate into the i18n template. */
  vars?: Record<string, string | number>;
}

/** Country the user is shopping FROM (their locale's home market). */
const LOCALE_TO_COUNTRY: Record<AppLocale, CountryCode> = {
  ko: 'KR',
  en: 'US',
  vi: 'VN',
};

/**
 * KR customs de minimis for personal-use imports is roughly USD $150 (gift
 * threshold $100; general import $150). Above this the user usually owes
 * 8% duty + 10% VAT depending on HS code. We just flag the risk — Tony isn't
 * a customs broker, but a heads-up is what the user actually needs.
 */
const KR_CUSTOMS_FREE_USD = 150;
const VN_CUSTOMS_FREE_VND = 1_000_000; // VND, similar de minimis principle

const CROSS_BORDER_STORES: Record<string, CountryCode | null> = {
  Amazon: 'US',
  eBay: 'US',
  Shopee: 'SG',
  Lazada: 'SG',
  AliExpress: 'US',
  TikTokShop: 'US',
};

export function buildCheckoutChecks(
  product: Product,
  userLocale: AppLocale,
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const userCountry = LOCALE_TO_COUNTRY[userLocale];

  // 1) Cross-border customs warning
  const inferredCountry =
    product.country ?? CROSS_BORDER_STORES[product.store] ?? null;
  if (inferredCountry && inferredCountry !== userCountry) {
    if (userCountry === 'KR') {
      const usd = convertMoneySync(product.finalPrice, 'USD');
      const usdAmount = usd.currency === 'USD' ? usd.amount : 0;
      if (usdAmount > KR_CUSTOMS_FREE_USD) {
        items.push({
          key: 'customsKR',
          severity: 'warning',
          vars: { threshold: `$${KR_CUSTOMS_FREE_USD}`, price: `$${usdAmount.toFixed(0)}` },
        });
      }
    } else if (userCountry === 'VN') {
      // VND view; if price (in VND) above threshold, warn.
      const vnd = convertMoneySync(product.finalPrice, 'VND');
      if (vnd.currency === 'VND' && vnd.amount > VN_CUSTOMS_FREE_VND) {
        items.push({
          key: 'customsVN',
          severity: 'warning',
          vars: { threshold: '1,000,000 VND' },
        });
      }
    }
  }

  // 2) Low-authenticity warning
  if (product.authenticityPct < 70 && !product.official) {
    items.push({
      key: 'authenticityLow',
      severity: 'caution',
      vars: { pct: product.authenticityPct, store: product.store },
    });
  }

  // 3) Discount expiry heads-up
  if (product.discountPct > 0) {
    items.push({
      key: 'discountExpiry',
      severity: 'info',
      vars: { pct: product.discountPct },
    });
  }

  // 4) Free shipping reminder
  if (product.shippingFee.amount === 0) {
    items.push({
      key: 'freeShip',
      severity: 'info',
    });
  }

  // 5) Return policy boilerplate (always last; lowest severity)
  items.push({
    key: 'returnPolicy',
    severity: 'info',
    vars: { store: product.store },
  });

  return items;
}
