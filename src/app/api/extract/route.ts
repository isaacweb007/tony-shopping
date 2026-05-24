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
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractFromImage } from '@/lib/vision';
import { detectProvider, fetchOembed } from '@/lib/oembed';
import { fetchOgMeta } from '@/lib/og-scraper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  imageDataUrl: z.string().startsWith('data:image/').optional(),
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

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { imageDataUrl, link } = parsed.data;
  if (!imageDataUrl && !link) {
    return NextResponse.json({ error: 'empty_input' }, { status: 400 });
  }

  // ----- Image path -----
  if (imageDataUrl) {
    const v = await extractFromImage(imageDataUrl);
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
    return NextResponse.json({
      suggestedQuery: deriveQueryFromTitle(oembed.title),
      hint: `${oembed.provider}:${oembed.author ?? ''}`,
      tags: [oembed.provider, ...(oembed.author ? [oembed.author] : [])],
      image: oembed.image,
      source: 'oembed' as const,
    });
  }

  // Fall back to OG meta for Instagram + everything else
  const og = await fetchOgMeta(url);
  if (og) {
    const q = deriveQueryFromTitle(og.title, og.description);
    const tags: string[] = [];
    if (provider !== 'unknown') tags.push(provider);
    if (og.siteName) tags.push(og.siteName);
    if (og.type) tags.push(og.type);
    return NextResponse.json({
      suggestedQuery: q,
      hint: og.siteName ? `og:${og.siteName}` : 'og',
      tags,
      image: og.image,
      source: 'og' as const,
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
