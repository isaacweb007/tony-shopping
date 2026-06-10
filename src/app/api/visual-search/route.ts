/**
 * GET /api/visual-search?imageUrl=<public image>&locale=ko
 *
 * Reverse-image product search: given a public image URL (an SNS post
 * thumbnail), returns the actual stores/pages selling that product via Google
 * Lens. This is the "find where it's sold" path that matches the app's intent
 * most directly. Returns { matches: [] } when SERPAPI_KEY is unset — the client
 * then relies on the keyword search.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { reverseImageSearch } from '@/lib/search/reverse-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const Query = z.object({
  imageUrl: z.string().url().max(2000),
  locale: z.enum(['ko', 'en', 'vi']).catch('ko'),
});

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse({
    imageUrl: req.nextUrl.searchParams.get('imageUrl') ?? '',
    locale: req.nextUrl.searchParams.get('locale') ?? 'ko',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_query', matches: [] }, { status: 400 });
  }

  const matches = await reverseImageSearch(parsed.data.imageUrl, {
    locale: parsed.data.locale,
    signal: req.signal,
  });

  return NextResponse.json(
    { matches },
    {
      headers: {
        // Visual matches for a given image are stable — cache for an hour.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
