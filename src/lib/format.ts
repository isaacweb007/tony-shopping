import type { Money } from '@/types/product';
import type { AppLocale } from '@/i18n/routing';
import { convertMoneySync, localeCurrency } from './currency';

const LOCALE_MAP: Record<AppLocale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  vi: 'vi-VN',
};

/** Format Money using Intl. Always returns a localized string. */
export function formatMoney(money: Money, locale: AppLocale): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale], {
    style: 'currency',
    currency: money.currency,
    maximumFractionDigits: money.currency === 'KRW' || money.currency === 'JPY' || money.currency === 'VND' ? 0 : 2,
  }).format(money.amount);
}

/**
 * Convert money to the locale's preferred currency (best-effort, sync, falls
 * back to the original currency on cache miss), then format.
 */
export function formatMoneyLocale(money: Money, locale: AppLocale): string {
  const target = localeCurrency(locale);
  const converted = convertMoneySync(money, target);
  return formatMoney(converted, locale);
}

export interface DualMoney {
  /** Always set — the user's locale-preferred-currency rendering. */
  primary: string;
  /** Set ONLY when the original currency differed from the locale currency. */
  secondary: string | null;
  /** Underlying converted Money (so callers can reason about amount). */
  converted: Money;
}

/**
 * Dual-currency formatter. KR user looking at a US-store listing in USD will
 * see `primary = "₩302,000"` and `secondary = "$218"`. Same KR user on a KRW
 * listing sees `primary = "₩329,000"` and `secondary = null` (no echo of the
 * same number in the same currency).
 *
 * Falls back gracefully when the FX cache is cold: primary = formatted
 * original; secondary = null (we don't have a target rendering to show).
 */
export function formatMoneyDual(money: Money, locale: AppLocale): DualMoney {
  const target = localeCurrency(locale);
  const converted = convertMoneySync(money, target);
  const conversionWorked = converted.currency === target;
  if (!conversionWorked) {
    // FX cache miss — render the original; no dual line.
    return {
      primary: formatMoney(money, locale),
      secondary: null,
      converted: money,
    };
  }
  const primary = formatMoney(converted, locale);
  if (money.currency === target) {
    return { primary, secondary: null, converted };
  }
  return {
    primary,
    secondary: formatMoney(money, locale),
    converted,
  };
}

/** Format an integer count with locale-aware separators. */
export function formatCount(n: number, locale: AppLocale): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale]).format(n);
}

type TranslateFn = (
  key: string,
  vars?: Record<string, string | number | Date>,
) => string;

/** Human shipping ETA. translator gives us the labels (today/tomorrow/in {d} days). */
export function shipLabel(d: number, t: TranslateFn): string {
  if (d <= 0) return t('ship.today');
  if (d === 1) return t('ship.tomorrow');
  return t('ship.days', { d });
}

/** Map AppLocale -> Intl locale string. */
export function intlLocale(locale: AppLocale): string {
  return LOCALE_MAP[locale];
}
