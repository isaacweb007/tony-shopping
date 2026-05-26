import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runServerSearch } from '@/lib/search/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  q: z.string().min(1, 'query is required').max(500),
  locale: z.enum(['ko', 'en', 'vi']).optional(),
  // /setup probe button passes ?only=<StoreId> to drive a single adapter.
  // Kept loose (string) — the runner case-folds + validates against its
  // registry, and falls back to the full set on no-match.
  only: z.string().min(1).max(40).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    q: req.nextUrl.searchParams.get('q') ?? '',
    locale: req.nextUrl.searchParams.get('locale') ?? undefined,
    only: req.nextUrl.searchParams.get('only') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await runServerSearch(
      { q: parsed.data.q, attachments: [] },
      { signal: req.signal, locale: parsed.data.locale, only: parsed.data.only },
    );
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json({ error: 'search_failed', message }, { status: 500 });
  }
}
