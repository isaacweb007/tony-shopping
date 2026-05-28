/**
 * POST /api/recommendations
 *
 * Personalised product suggestions based on the user's recent search +
 * click history. Sent from the client because history lives in
 * localStorage. Returns 4 product names + reasons for the home page
 * "당신이 좋아할 만한" rail.
 *
 * No edge cache — history is per-user and each user's history shifts
 * over time, so caching here would either leak data across users or
 * mostly miss. Cost stays bounded by client-side staleTime in React
 * Query (15 min).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { suggestPersonal, suggestPersonalWithTrace } from '@/lib/personal-recommendations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  recentQueries: z.array(z.string().min(1).max(200)).max(20),
  recentClicks: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        query: z.string().max(200),
      }),
    )
    .max(20),
  locale: z.enum(['ko', 'en', 'vi']),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    const body = await req.json();
    parsed = Body.safeParse(body);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const trace = req.nextUrl.searchParams.get('trace') === '1';
  if (trace) {
    const traced = await suggestPersonalWithTrace(parsed.data);
    return NextResponse.json(traced, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const result = await suggestPersonal(parsed.data);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
