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

export type OembedProvider =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'twitter'
  | 'threads'
  | 'pinterest'
  | 'unknown';

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
    if (host === 'twitter.com' || host === 'x.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) {
      return 'twitter';
    }
    if (host === 'threads.net' || host === 'threads.com' || host.endsWith('.threads.net') || host.endsWith('.threads.com')) {
      return 'threads';
    }
    if (host === 'pinterest.com' || host.endsWith('.pinterest.com') || host === 'pin.it') {
      return 'pinterest';
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

/**
 * X (Twitter) — publish.twitter.com exposes a public oEmbed endpoint that
 * accepts both twitter.com and x.com URLs. We pass omit_script=true so we
 * never pull their embed.js into the server response.
 */
async function twitter(url: string): Promise<OembedResult | null> {
  const ep = `https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(url)}`;
  const res = await fetchWithTimeout(ep);
  if (!res || !res.ok) return null;
  const j = (await res.json().catch(() => null)) as
    | { html?: string; author_name?: string; title?: string }
    | null;
  if (!j) return null;
  // X's oEmbed returns the tweet's html; the visible text is inside <p>…</p>.
  let title = j.title;
  if (!title && j.html) {
    const m = j.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (m && m[1]) title = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return { provider: 'twitter', title, author: j.author_name, url };
}

/**
 * Threads — Meta does not expose a public oEmbed for Threads (it requires
 * the Threads Graph API + a developer token). We return null so the caller
 * falls back to the OG scraper, which Threads serves cleanly.
 */
async function threads(_url: string): Promise<OembedResult | null> {
  return null;
}

/**
 * Pinterest — has a public oEmbed at /oembed.json. Returns title (board
 * name + pinned-by author) + thumbnail.
 */
async function pinterest(url: string): Promise<OembedResult | null> {
  const ep = `https://www.pinterest.com/oembed.json/?url=${encodeURIComponent(url)}`;
  const res = await fetchWithTimeout(ep);
  if (!res || !res.ok) return null;
  const j = (await res.json().catch(() => null)) as
    | { title?: string; thumbnail_url?: string; author_name?: string }
    | null;
  if (!j) return null;
  return {
    provider: 'pinterest',
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
  if (p === 'twitter') return twitter(url);
  if (p === 'pinterest') return pinterest(url);
  if (p === 'threads') return threads(url);
  // Instagram & unknown: caller should fall back to OG meta.
  return null;
}
