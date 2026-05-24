/**
 * POST /api/extract
 * Body: { imageDataUrl?: string; link?: string }
 * Returns: { suggestedQuery: string; hint: string; tags: string[]; source: 'vision'|'og'|'fallback' }
 *
 * Phase 4 stub upgraded:
 *  - imageDataUrl  → Google Vision API when GOOGLE_VISION_API_KEY is set,
 *                    else a deterministic placeholder result.
 *  - link          → host-based heuristic for now; Phase D adds OG/oEmbed.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractFromImage } from '@/lib/vision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  imageDataUrl: z.string().startsWith('data:image/').optional(),
  link: z.string().url().optional(),
});

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

  if (imageDataUrl) {
    const v = await extractFromImage(imageDataUrl);
    return NextResponse.json({
      suggestedQuery: v.suggestedQuery,
      hint: v.source === 'vision' ? 'Vision API detected' : 'Heuristic placeholder',
      tags: v.tags,
      source: v.source,
    });
  }

  // Link path (host-heuristic, Phase D will fetch OG/oEmbed)
  const host = safeHost(link!);
  const tags: string[] = [];
  if (/instagram/i.test(host)) tags.push('instagram', 'fashion');
  else if (/tiktok/i.test(host)) tags.push('tiktok', 'short-video');
  else if (/youtube|youtu\.be/i.test(host)) tags.push('youtube-shorts');
  else if (/amazon|coupang|shopee|lazada|ebay/i.test(host)) tags.push('shop-listing');

  return NextResponse.json({
    suggestedQuery: '',
    hint: `Inferred from link: ${host || 'unknown'}`,
    tags,
    source: 'og' as const,
  });
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
