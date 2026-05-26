/**
 * GET /api/cohort/by-slugs?slugs=a,b,c
 *
 * Batch-fetch metadata for a specific list of cohort slugs (no recency
 * order). Used by /dashboard's "내 인기 비교" card to show stats for the
 * shares this device created — anonymous ownership means we can't query
 * by user_id, so the client passes the slug list it has in localStorage.
 *
 * Hard cap of 50 slugs per request to keep the IN clause bounded.
 * 503 when Supabase isn't configured.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9]{1,16}$/;
const MAX_SLUGS = 50;

interface SnapLike {
  id?: unknown;
  name?: unknown;
  store?: unknown;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('slugs') ?? '';
  const slugs = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => SLUG_RE.test(s))
    .slice(0, MAX_SLUGS);

  if (slugs.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_unconfigured', items: [] }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('cohort_shares')
    .select('slug, snaps, winner_id, priority, locale, created_at, clones')
    .in('slug', slugs);
  if (error) return NextResponse.json({ error: error.message, items: [] }, { status: 500 });

  const items = (data ?? []).map((row) => {
    const snaps: SnapLike[] = Array.isArray(row.snaps) ? (row.snaps as SnapLike[]) : [];
    const winner = snaps.find((s) => s.id === row.winner_id) ?? null;
    return {
      slug: row.slug,
      winnerName: typeof winner?.name === 'string' ? winner.name.slice(0, 120) : null,
      winnerStore: typeof winner?.store === 'string' ? String(winner.store).slice(0, 40) : null,
      n: snaps.length,
      priority: row.priority,
      locale: row.locale,
      createdAt: row.created_at,
      clones: typeof row.clones === 'number' ? row.clones : 0,
    };
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
