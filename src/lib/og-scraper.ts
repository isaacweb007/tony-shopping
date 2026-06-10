/**
 * Tiny OpenGraph / generic <meta> scraper.
 *
 * Tony uses this when oEmbed isn't available (Instagram, Facebook, generic shop
 * pages). We avoid heavy DOM parsers — regex + a 256KB body cap is plenty for
 * <head>.
 *
 * UA strategy matters a lot here. Many of the platforms users actually paste
 * from (Instagram, Facebook, news/shop pages) serve their OpenGraph preview
 * tags to RECOGNIZED link-preview crawlers but hide them (login wall / JS
 * shell) from a generic or unknown bot. So we try `facebookexternalhit` first —
 * the UA the whole web optimizes its share previews for — and only fall back to
 * a real browser UA when that yields no usable tags (the rare site that blocks
 * crawlers but serves browsers).
 */
import 'server-only';

// The UA virtually every site special-cases to emit OG tags for (it's how FB,
// iMessage, Slack, etc. build link previews).
const UA_CRAWLER =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
// Fallback: a current desktop Chrome, for sites that block unknown crawlers.
const UA_BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

/** Parse OG / Twitter / generic meta tags out of an HTML string. */
function parseMeta(url: string, html: string): OgMeta {
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

/** Fetch `url`'s HTML with a given UA. Returns null on error / non-HTML / !ok. */
async function fetchHtmlWithUA(
  url: string,
  ua: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(new Error('og-fetch timeout')), FETCH_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) ctrl.abort(signal.reason);
    else signal.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });
  }
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8,vi;q=0.7',
      },
      signal: ctrl.signal,
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml/.test(ct)) return null;
    return await readCapped(res, MAX_BYTES);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a URL and extract OG / Twitter / generic meta tags. Tries the
 * link-preview crawler UA first, then a browser UA when that yields no usable
 * title/image. Returns `null` only when neither attempt reaches usable HTML.
 */
export async function fetchOgMeta(url: string, signal?: AbortSignal): Promise<OgMeta | null> {
  const html = await fetchHtmlWithUA(url, UA_CRAWLER, signal);
  let result: OgMeta | null = html ? parseMeta(url, html) : null;

  // Retry with a browser UA when the crawler pass got nothing useful.
  if (!result || (!result.image && !result.title)) {
    const html2 = await fetchHtmlWithUA(url, UA_BROWSER, signal);
    if (html2) {
      const result2 = parseMeta(url, html2);
      if (result2.image || result2.title || !result) result = result2;
    }
  }

  return result;
}
