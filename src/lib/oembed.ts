/**
 * Lightweight oEmbed wrappers for the social platforms our users link from.
 *
 * - YouTube  : public oEmbed endpoint, no auth.
 * - TikTok   : public oEmbed endpoint, no auth.
 * - Instagram: oEmbed is gated behind a Facebook App + token now; we fall back
 *              to OG meta scraping for Instagram links.
 *
 * Returns a normalized shape — callers don't need to know which provider.
 */
import 'server-only';

const FETCH_TIMEOUT_MS = 5000;

export type OembedProvider = 'youtube' | 'tiktok' | 'instagram' | 'unknown';

export interface OembedResult {
  provider: OembedProvider;
  /** Title / author line in single string */
  title?: string;
  /** Thumbnail URL */
  image?: string;
  /** Author / channel handle */
  author?: string;
  /** Original URL */
  url: string;
}

export function detectProvider(url: string): OembedProvider {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) {
      return 'youtube';
    }
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      return 'tiktok';
    }
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
      return 'instagram';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response | null> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error('oembed timeout')), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; TonyShopping/1.0)',
        ...(opts.headers ?? {}),
      },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

async function youtube(url: string): Promise<OembedResult | null> {
  const ep = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetchWithTimeout(ep);
  if (!res || !res.ok) return null;
  const j = (await res.json().catch(() => null)) as
    | { title?: string; thumbnail_url?: string; author_name?: string }
    | null;
  if (!j) return null;
  return {
    provider: 'youtube',
    title: j.title,
    image: j.thumbnail_url,
    author: j.author_name,
    url,
  };
}

async function tiktok(url: string): Promise<OembedResult | null> {
  const ep = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const res = await fetchWithTimeout(ep);
  if (!res || !res.ok) return null;
  const j = (await res.json().catch(() => null)) as
    | { title?: string; thumbnail_url?: string; author_name?: string }
    | null;
  if (!j) return null;
  return {
    provider: 'tiktok',
    title: j.title,
    image: j.thumbnail_url,
    author: j.author_name,
    url,
  };
}

/** Dispatch to the right provider; returns null on unknown or any failure. */
export async function fetchOembed(url: string): Promise<OembedResult | null> {
  const p = detectProvider(url);
  if (p === 'youtube') return youtube(url);
  if (p === 'tiktok') return tiktok(url);
  // Instagram & unknown: caller should fall back to OG meta.
  return null;
}
