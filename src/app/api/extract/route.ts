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
import { extractYouTubeId, youtubeFrameUrls } from '@/lib/video-frames';
import { reverseImageSearch } from '@/lib/search/reverse-image';
import { deriveQueryFromLens } from '@/lib/search/derive-query';
import type { LensMatch } from '@/lib/search/lens-map';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  imageDataUrl: z.string().startsWith('data:image/').optional(),
  /** Original filename — used by the Vision-less fallback heuristic. */
  filename: z.string().max(300).optional(),
  link: z.string().url().optional(),
  /** Caller locale — geos the reverse-image (Lens) fallback to the right market. */
  locale: z.enum(['ko', 'en', 'vi']).optional(),
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
        // A real browser UA — social CDNs (Instagram, TikTok) sometimes refuse
        // unknown bots, which would starve vision/Lens of the thumbnail.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
 * Run vision pipeline on one OR MORE frame data URLs: try Claude first
 * (shopping-grade phrasing + multiple candidates, reasons across all
 * frames), then Google Vision on the first frame. Returns null if neither
 * yields something usable.
 */
async function identifyFromThumbnail(
  dataUrls: string | string[],
  caption?: string,
): Promise<{
  query: string;
  candidates: string[];
  tags: string[];
  provider: 'claude' | 'google';
} | null> {
  const claude = await identifyProductWithClaude(dataUrls, { caption });
  if (claude) {
    return {
      query: claude.main,
      candidates: claude.alternatives,
      tags: [claude.main, ...claude.alternatives],
      provider: 'claude',
    };
  }
  // Google Vision only takes one image — use the first (cover) frame.
  const first = Array.isArray(dataUrls) ? dataUrls[0]! : dataUrls;
  const v = await extractFromImage(first);
  if (v.source === 'vision' && v.suggestedQuery && v.suggestedQuery.length >= 3) {
    return {
      query: v.suggestedQuery,
      candidates: v.tags.slice(1, 3),
      tags: v.tags,
      provider: 'google',
    };
  }
  return null;
}

/**
 * Gather the image frames to analyse for a link. For YouTube we pull
 * several timeline-sampled storyboard frames (catches mid-video products);
 * for everything else we use the single oEmbed/OG thumbnail.
 */
async function gatherFrames(
  link: string,
  thumbnailUrl: string | undefined,
): Promise<string[]> {
  const ytId = extractYouTubeId(link);
  if (ytId) {
    const frameUrls = youtubeFrameUrls(ytId);
    const settled = await Promise.all(frameUrls.map((u) => fetchImageAsDataUrl(u)));
    const frames = settled.filter((d): d is string => d !== null);
    if (frames.length > 0) return frames;
  }
  // Non-YouTube or YouTube frames all failed → single thumbnail.
  if (thumbnailUrl) {
    const single = await fetchImageAsDataUrl(thumbnailUrl);
    if (single) return [single];
  }
  return [];
}

/**
 * Lens-grounded identification fallback. When vision can't name the product
 * (no ANTHROPIC_API_KEY, or it returned nothing) we run reverse-image search on
 * the thumbnail and derive a clean product query from the REAL listings of the
 * pictured item — accurate identification with only SERPAPI_KEY. Returns null
 * when SerpAPI is unconfigured or there are no matches.
 */
async function identifyFromLens(
  thumbnailUrl: string,
  locale: 'ko' | 'en' | 'vi' | undefined,
  signal?: AbortSignal,
): Promise<{ query: string; matches: LensMatch[] } | null> {
  const matches = await reverseImageSearch(thumbnailUrl, { locale, signal, limit: 12 });
  if (matches.length === 0) return null;
  const query = deriveQueryFromLens(matches);
  if (!query) return null;
  return { query, matches };
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

  const { imageDataUrl, filename, link, locale } = parsed.data;
  if (!imageDataUrl && !link) {
    return NextResponse.json({ error: 'empty_input' }, { status: 400 });
  }

  // ----- Direct image upload path -----
  // Prefer Claude for shopping-grade phrasing; fall back to Google Vision.
  if (imageDataUrl) {
    const claude = await identifyProductWithClaude(imageDataUrl);
    if (claude) {
      return NextResponse.json({
        suggestedQuery: claude.main,
        candidates: claude.alternatives,
        hint: 'Claude vision',
        tags: [claude.main, ...claude.alternatives],
        source: 'vision' as const,
      });
    }
    const v = await extractFromImage(imageDataUrl, filename);
    return NextResponse.json({
      suggestedQuery: v.suggestedQuery,
      candidates: v.tags.slice(1, 3),
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

    // Run vision on the video frames — for TikTok/IG/short-form video the
    // title is often a description ("click link above") rather than a
    // product name, so the imagery is the only real signal. YouTube gets
    // multiple timeline frames; others get the single thumbnail.
    let visionQuery = '';
    let visionCandidates: string[] = [];
    let visionTags: string[] = [];
    let visionProvider: 'claude' | 'google' | null = null;
    const frames = await gatherFrames(url, oembed.image);
    if (frames.length > 0) {
      const r = await identifyFromThumbnail(frames, oembed.title);
      if (r) {
        visionQuery = r.query;
        visionCandidates = r.candidates;
        visionTags = r.tags;
        visionProvider = r.provider;
      }
    }

    // Lens fallback: no vision query → derive one from real listings matching
    // the thumbnail (works with only SERPAPI_KEY, no vision API).
    let lensQuery = '';
    let lensTags: string[] = [];
    if (!visionQuery && oembed.image) {
      const lens = await identifyFromLens(oembed.image, locale, req.signal);
      if (lens) {
        lensQuery = lens.query;
        lensTags = lens.matches.slice(0, 3).map((m) => m.source);
      }
    }

    const suggestedQuery = visionQuery || lensQuery || titleQuery;
    const source = visionProvider ? ('vision' as const) : lensQuery ? ('lens' as const) : ('oembed' as const);
    return NextResponse.json({
      suggestedQuery,
      candidates: visionCandidates,
      hint: visionProvider
        ? `${visionProvider}-vision-${oembed.provider}`
        : lensQuery
          ? `lens-${oembed.provider}`
          : `${oembed.provider}:${oembed.author ?? ''}`,
      tags: [
        ...visionTags,
        ...lensTags,
        oembed.provider,
        ...(oembed.author ? [oembed.author] : []),
      ],
      image: oembed.image,
      source,
    });
  }

  // Fall back to OG meta for Instagram + everything else
  const og = await fetchOgMeta(url);
  if (og) {
    const titleQuery = deriveQueryFromTitle(og.title, og.description);

    // Same enrichment for OG: gather frames (YouTube multi-frame, else the
    // og:image) and run vision.
    let visionQuery = '';
    let visionCandidates: string[] = [];
    let visionTags: string[] = [];
    let visionProvider: 'claude' | 'google' | null = null;
    const frames = await gatherFrames(url, og.image);
    if (frames.length > 0) {
      const r = await identifyFromThumbnail(frames, og.title ?? og.description);
      if (r) {
        visionQuery = r.query;
        visionCandidates = r.candidates;
        visionTags = r.tags;
        visionProvider = r.provider;
      }
    }

    // Lens fallback when vision yielded nothing (see oembed branch).
    let lensQuery = '';
    let lensTags: string[] = [];
    if (!visionQuery && og.image) {
      const lens = await identifyFromLens(og.image, locale, req.signal);
      if (lens) {
        lensQuery = lens.query;
        lensTags = lens.matches.slice(0, 3).map((m) => m.source);
      }
    }

    const tags: string[] = [...visionTags, ...lensTags];
    if (provider !== 'unknown') tags.push(provider);
    if (og.siteName) tags.push(og.siteName);
    if (og.type) tags.push(og.type);

    const suggestedQuery = visionQuery || lensQuery || titleQuery;
    const source = visionProvider ? ('vision' as const) : lensQuery ? ('lens' as const) : ('og' as const);
    return NextResponse.json({
      suggestedQuery,
      candidates: visionCandidates,
      hint: visionProvider
        ? `${visionProvider}-vision-og`
        : lensQuery
          ? 'lens-og'
          : og.siteName
            ? `og:${og.siteName}`
            : 'og',
      tags,
      image: og.image,
      source,
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
