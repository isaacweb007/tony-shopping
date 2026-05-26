/**
 * GET /api/cohort/recent
 *
 * Returns the 5 most recent publicly-shared cohorts so /compare's footer can
 * surface "what other people are comparing right now". PII-free: we expose
 * the slug, the winner's name + store (already in the open share payload),
 * snap count, priority, and createdAt.
 *
 * 503 when Supabase isn't configured — caller hides the section.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SnapLike {
  id?: unknown;
  name?: unknown;
  store?: unknown;
}

export async function GET() {
  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_unconfigured', items: [] }, { status: 503 });
  }
  const { data, error } = await supabase
    .from('cohort_shares')
    .select('slug, snaps, winner_id, priority, locale, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
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
    };
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
