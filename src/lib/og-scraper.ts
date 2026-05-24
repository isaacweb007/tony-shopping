/**
 * Tiny OpenGraph / generic <meta> scraper.
 *
 * Tony uses this when oEmbed isn't available (Instagram, generic shop pages).
 * We avoid heavy DOM parsers — regex + a 256KB body cap is plenty for <head>.
 */
import 'server-only';

const UA =
  'Mozilla/5.0 (compatible; TonyShopping/1.0; +https://tonyshopping.io/bot)';
const MAX_BYTES = 256 * 1024;
const FETCH_TIMEOUT_MS = 6000;

export interface OgMeta {
  url: string;
  /** og:title || <title> */
  title?: string;
  /** og:description || meta[name="description"] */
  description?: string;
  /** og:image */
  image?: string;
  /** og:site_name */
  siteName?: string;
  /** og:type */
  type?: string;
}

/** Read at most maxBytes from a fetch response body. */
async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  const decoder = new TextDecoder('utf-8');
  let total = 0;
  let out = '';
  while (total < maxBytes) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    out += decoder.decode(value, { stream: true });
  }
  try {
    await reader.cancel();
  } catch {
    /* noop */
  }
  return out;
}

function meta(html: string, regexes: RegExp[]): string | undefined {
  for (const re of regexes) {
    const m = re.exec(html);
    if (m && m[1]) return decodeEntities(m[1].trim());
  }
  return undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Fetch a URL and extract OG / Twitter / generic meta tags.
 * Returns `null` when the fetch fails.
 */
export async function fetchOgMeta(url: string, signal?: AbortSignal): Promise<OgMeta | null> {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(new Error('og-fetch timeout')), FETCH_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) ctrl.abort(signal.reason);
    else signal.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });
  }

  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8,vi;q=0.7',
      },
      signal: ctrl.signal,
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!res.ok) return { url };
    const ct = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml/.test(ct)) return { url };
    html = await readCapped(res, MAX_BYTES);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  const title =
    meta(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<title[^>]*>([^<]{1,300})<\/title>/i,
    ]) || undefined;

  const description = meta(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ]);

  const image = meta(html, [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ]);

  const siteName = meta(html, [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
  ]);

  const type = meta(html, [
    /<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i,
  ]);

  return { url, title, description, image, siteName, type };
}
