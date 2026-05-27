/**
 * POST /api/extract
 * Body: { imageDataUrl?: string; link?: string }
 * Returns: {
 *   suggestedQuery: string;
 *   hint: string;
 *   tags: string[];
 *   image?: string;
 *   source: 'vision' | 'oembed' | 'og' | 'fallback'
 * }
 *
 * Image  → Google Vision (or fallback)
 * Link   → oEmbed when possible (YouTube, TikTok), else OG meta scrape
 *          (Instagram, generic shopping pages)
 *
 * When the link yields a thumbnail (TikTok / IG video / pin / YouTube)
 * we ALSO run vision on that thumbnail, because the link's title is
 * typically a video description ("👆 click link above") rather than a
 * product name. Claude vision is tried first for shopping-grade phrasing;
 * Google Vision is the backstop.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractFromImage } from '@/lib/vision';
import { identifyProductWithClaude } from '@/lib/vision-claude';
import { detectProvider, fetchOembed } from '@/lib/oembed';
import { fetchOgMeta } from '@/lib/og-scraper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  imageDataUrl: z.string().startsWith('data:image/').optional(),
  /** Original filename — used by the Vision-less fallback heuristic. */
  filename: z.string().max(300).optional(),
  link: z.string().url().optional(),
});

/** Drop "- YouTube", "| Instagram" tail noise the platforms append. */
function trimPlatformSuffix(s: string): string {
  return s
    .replace(/\s*[\|\-–·]\s*(YouTube|Instagram|TikTok)\s*$/i, '')
    .replace(/\s+on Instagram[^"]*$/i, '')
    .trim();
}

/** Pick the strongest signal as a free-form search query. */
function deriveQueryFromTitle(title?: string, description?: string): string {
  if (title) return trimPlatformSuffix(title).slice(0, 80);
  if (description) return trimPlatformSuffix(description).slice(0, 80);
  return '';
}

const IMG_FETCH_TIMEOUT_MS = 6000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Fetch a remote image URL and return it as a base64 data URL ready for
 * vision APIs. Returns null on any error — non-image content type, timeout,
 * size cap exceeded, non-2xx. Honors signed query strings (TikTok CDN).
 */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(IMG_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TonyShopping/1.0)',
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,*/*',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!ct.startsWith('image/')) return null;
    // Normalise to a Claude/Vision-safe mime type.
    const mediaType = /(png|jpeg|jpg|gif|webp)/i.test(ct)
      ? ct.split(';')[0]!.trim().replace('image/jpg', 'image/jpeg')
      : 'image/jpeg';
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    const base64 = Buffer.from(buf).toString('base64');
    return `data:${mediaType};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Run vision pipeline on a thumbnail data URL: try Claude first (shopping-
 * grade phrasing), then Google Vision. Returns null if neither yields
 * something usable.
 */
async function identifyFromThumbnail(
  dataUrl: string,
): Promise<{ query: string; tags: string[]; provider: 'claude' | 'google' } | null> {
  const claudeQuery = await identifyProductWithClaude(dataUrl);
  if (claudeQuery && claudeQuery.length >= 3) {
    return { query: claudeQuery, tags: [claudeQuery], provider: 'claude' };
  }
  const v = await extractFromImage(dataUrl);
  if (v.source === 'vision' && v.suggestedQuery && v.suggestedQuery.length >= 3) {
    return { query: v.suggestedQuery, tags: v.tags, provider: 'google' };
  }
  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { imageDataUrl, filename, link } = parsed.data;
  if (!imageDataUrl && !link) {
    return NextResponse.json({ error: 'empty_input' }, { status: 400 });
  }

  // ----- Direct image upload path -----
  // Prefer Claude for shopping-grade phrasing; fall back to Google Vision.
  if (imageDataUrl) {
    const claudeQuery = await identifyProductWithClaude(imageDataUrl);
    if (claudeQuery) {
      return NextResponse.json({
        suggestedQuery: claudeQuery,
        hint: 'Claude vision',
        tags: [claudeQuery],
        source: 'vision' as const,
      });
    }
    const v = await extractFromImage(imageDataUrl, filename);
    return NextResponse.json({
      suggestedQuery: v.suggestedQuery,
      hint: v.source === 'vision' ? 'Vision API detected' : 'Heuristic placeholder',
      tags: v.tags,
      source: v.source,
    });
  }

  // ----- Link path -----
  const url = link!;
  const provider = detectProvider(url);

  // Try oEmbed first (YouTube, TikTok)
  const oembed = await fetchOembed(url);
  if (oembed) {
    const titleQuery = deriveQueryFromTitle(oembed.title);

    // If we have a thumbnail, also run vision — for TikTok/IG/short-form
    // video the title is often a description ("click link above") rather
    // than a product name, so the thumbnail is the only real signal.
    let visionQuery = '';
    let visionTags: string[] = [];
    let visionProvider: 'claude' | 'google' | null = null;
    if (oembed.image) {
      const thumbData = await fetchImageAsDataUrl(oembed.image);
      if (thumbData) {
        const r = await identifyFromThumbnail(thumbData);
        if (r) {
          visionQuery = r.query;
          visionTags = r.tags;
          visionProvider = r.provider;
        }
      }
    }

    const suggestedQuery = visionQuery || titleQuery;
    return NextResponse.json({
      suggestedQuery,
      hint: visionProvider
        ? `${visionProvider}-vision-${oembed.provider}`
        : `${oembed.provider}:${oembed.author ?? ''}`,
      tags: [
        ...visionTags,
        oembed.provider,
        ...(oembed.author ? [oembed.author] : []),
      ],
      image: oembed.image,
      source: visionProvider ? ('vision' as const) : ('oembed' as const),
    });
  }

  // Fall back to OG meta for Instagram + everything else
  const og = await fetchOgMeta(url);
  if (og) {
    const titleQuery = deriveQueryFromTitle(og.title, og.description);

    // Same enrichment for OG: if the page has an og:image, run vision.
    let visionQuery = '';
    let visionTags: string[] = [];
    let visionProvider: 'claude' | 'google' | null = null;
    if (og.image) {
      const thumbData = await fetchImageAsDataUrl(og.image);
      if (thumbData) {
        const r = await identifyFromThumbnail(thumbData);
        if (r) {
          visionQuery = r.query;
          visionTags = r.tags;
          visionProvider = r.provider;
        }
      }
    }

    const tags: string[] = [...visionTags];
    if (provider !== 'unknown') tags.push(provider);
    if (og.siteName) tags.push(og.siteName);
    if (og.type) tags.push(og.type);

    const suggestedQuery = visionQuery || titleQuery;
    return NextResponse.json({
      suggestedQuery,
      hint: visionProvider
        ? `${visionProvider}-vision-og`
        : og.siteName
          ? `og:${og.siteName}`
          : 'og',
      tags,
      image: og.image,
      source: visionProvider ? ('vision' as const) : ('og' as const),
    });
  }

  // Hard fallback — host string as the only signal
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    /* ignore */
  }
  return NextResponse.json({
    suggestedQuery: '',
    hint: `Could not read ${host || 'link'}`,
    tags: provider !== 'unknown' ? [provider] : [],
    source: 'fallback' as const,
  });
}
