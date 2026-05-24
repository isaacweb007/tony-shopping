/**
 * POST /api/extract
 * Body: { imageDataUrl?: string; link?: string }
 * Returns: { hint: string; tags: string[] }
 *
 * Phase 4 stub. Phase 5 will:
 *  - For images → call Google Vision (label + crop + brand)
 *  - For links → fetch OG meta / oEmbed (Instagram, TikTok, YouTube Shorts)
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';

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

  // Deterministic stub: derive a hint from the link host or image length.
  const tags: string[] = [];
  let hint = '';
  if (link) {
    const host = safeHost(link);
    if (/instagram/i.test(host)) tags.push('instagram', 'fashion');
    else if (/tiktok/i.test(host)) tags.push('tiktok', 'short-video');
    else if (/youtube|youtu\.be/i.test(host)) tags.push('youtube-shorts');
    else if (/amazon|coupang|shopee|lazada/i.test(host)) tags.push('shop-listing');
    hint = `Inferred from link: ${host || 'unknown'}.`;
  }
  if (imageDataUrl) {
    tags.push('image-upload');
    hint = (hint ? hint + ' ' : '') + `Image bytes: ~${Math.round(imageDataUrl.length / 1024)} KB.`;
  }

  return NextResponse.json({ hint, tags });
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
