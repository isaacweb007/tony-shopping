/**
 * Centralized site constants used by metadata, sitemap, robots, OG images.
 */
import type { AppLocale } from '@/i18n/routing';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export const SITE_NAME = 'Tony Shopping';
export const SITE_HANDLE = '@tonyshopping';

export const LOCALES = ['ko', 'en', 'vi'] as const satisfies readonly AppLocale[];
export const DEFAULT_LOCALE: AppLocale = 'ko';

/** Build a canonical absolute URL for a given path + locale. */
export function absoluteUrl(path = '/', locale?: AppLocale): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (locale && locale !== DEFAULT_LOCALE) {
    return `${SITE_URL}/${locale}${p === '/' ? '' : p}`;
  }
  return `${SITE_URL}${p}`;
}

/** Build the hreflang alternates map for a path. */
export function hreflangFor(path = '/'): Record<string, string> {
  const map: Record<string, string> = {};
  for (const loc of LOCALES) map[loc] = absoluteUrl(path, loc);
  map['x-default'] = absoluteUrl(path, DEFAULT_LOCALE);
  return map;
}
