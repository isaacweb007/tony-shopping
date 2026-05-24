import type { Money } from '@/types/product';
import type { AppLocale } from '@/i18n/routing';

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
