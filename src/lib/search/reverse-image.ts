/**
 * Reverse-image product search via SerpAPI's Google Lens engine.
 *
 * Given a PUBLIC image URL (an SNS post thumbnail / og:image), Lens returns the
 * actual pages and stores selling that exact product. This is the architecture
 * closest to the app's intent — "find where this is sold" — because it skips
 * the lossy "identify → guess keywords → keyword-search" chain entirely.
 *
 * Gated on SERPAPI_KEY: returns [] when the key is absent so callers degrade
 * gracefully (they fall back to the keyword search).
 */
import 'server-only';
import { mapLensMatches, type LensMatch } from './lens-map';

const ENDPOINT = 'https://serpapi.com/search.json';
const TIMEOUT_MS = 8000;

/** Map our app locale to SerpAPI's country (gl) + host language (hl). */
const LOCALE_GEO: Record<'ko' | 'en' | 'vi', { country: string; hl: string }> = {
  ko: { country: 'kr', hl: 'ko' },
  en: { country: 'us', hl: 'en' },
  vi: { country: 'vn', hl: 'vi' },
};

export interface ReverseImageOpts {
  locale?: 'ko' | 'en' | 'vi';
  signal?: AbortSignal;
  limit?: number;
}

// Module-level memo (per warm instance). The same SNS thumbnail is looked up
// both during extraction (to derive the query) and on the results page (the
// VisualMatches section), so deduping by image+locale avoids paying SerpAPI
// twice for the same picture within the TTL.
const MEMO_TTL_MS = 60 * 60 * 1000;
const memo = new Map<string, { at: number; matches: LensMatch[] }>();

/**
 * Run a Google Lens reverse-image search for `imageUrl`. Returns ranked visual
 * matches (price-bearing listings first), or [] when SERPAPI_KEY is missing or
 * the call fails. `imageUrl` MUST be publicly reachable — Lens fetches it
 * server-side, so data: URLs and localhost won't work.
 */
export async function reverseImageSearch(
  imageUrl: string,
  opts: ReverseImageOpts = {},
): Promise<LensMatch[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];
  if (!/^https?:\/\//i.test(imageUrl)) return []; // Lens needs a fetchable URL

  const localeKey = opts.locale ?? 'ko';
  const cacheKey = `${localeKey}:${imageUrl}`;
  const cached = memo.get(cacheKey);
  if (cached && Date.now() - cached.at < MEMO_TTL_MS) {
    return opts.limit ? cached.matches.slice(0, opts.limit) : cached.matches;
  }

  const geo = LOCALE_GEO[opts.locale ?? 'ko'];
  const params = new URLSearchParams({
    engine: 'google_lens',
    url: imageUrl,
    api_key: key,
    country: geo.country,
    hl: geo.hl,
  });

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: opts.signal ?? AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[reverse-image] serpapi non-ok', res.status);
      return [];
    }
    const json = await res.json();
    const all = mapLensMatches(json, 48); // memo a generous set; callers slice
    // Cap the memo (keyed by image URL → unbounded otherwise). Cheap reset
    // rather than LRU bookkeeping; entries are 1h-disposable anyway.
    if (memo.size > 200) memo.clear();
    memo.set(cacheKey, { at: Date.now(), matches: all });
    return opts.limit ? all.slice(0, opts.limit) : all;
  } catch (e) {
    console.error('[reverse-image] threw', e instanceof Error ? e.message : e);
    return [];
  }
}
