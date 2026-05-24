import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runServerSearch } from '@/lib/search/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  q: z.string().min(1, 'query is required').max(500),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    q: req.nextUrl.searchParams.get('q') ?? '',
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
      { signal: req.signal },
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
