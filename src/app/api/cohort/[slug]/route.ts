/**
 * GET /api/cohort/[slug]
 *
 * Public read of a previously-minted compare cohort. Anyone can follow the
 * /c/{slug} URL whether they're signed in or not. Returns 404 when the slug
 * doesn't exist; 503 when Supabase isn't configured (the page falls back to
 * a friendly "this link can't be opened right now" view).
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!slug || slug.length > 16 || !/^[a-z0-9]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }

  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('cohort_shares')
    .select('slug, snaps, winner_id, priority, locale, created_at, clones')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json(
    {
      slug: data.slug,
      snaps: data.snaps,
      winnerId: data.winner_id,
      priority: data.priority,
      locale: data.locale,
      createdAt: data.created_at,
      // 0 fallback for pre-migration rows (older shares that haven't been
      // touched since the 0004 migration shipped).
      clones: typeof data.clones === 'number' ? data.clones : 0,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
