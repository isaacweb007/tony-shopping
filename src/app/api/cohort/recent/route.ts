/**
 * GET /api/cohort/recent
 *
 * Returns the 5 most recent publicly-shared cohorts so /compare's footer can
 * surface "what other people are comparing right now". PII-free: we expose
 * the slug, the winner's name + store (already in the open share payload),
 * snap count, priority, and createdAt — plus an aggregated up/down count
 * from cohort_reactions so the footer can show social proof without an
 * extra round-trip per chip.
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

interface ReactionRow {
  slug: string;
  kind: 'up' | 'down';
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

  const rows = data ?? [];
  const slugs = rows.map((r) => r.slug as string);

  // One join query for all 5 cohorts. Tally locally — way cheaper than
  // 5 separate aggregates and keeps the route under one DB round-trip.
  const tallies = new Map<string, { up: number; down: number }>();
  if (slugs.length > 0) {
    const { data: reactRows, error: reactErr } = await supabase
      .from('cohort_reactions')
      .select('slug, kind')
      .in('slug', slugs);
    if (!reactErr) {
      for (const r of (reactRows ?? []) as ReactionRow[]) {
        const t = tallies.get(r.slug) ?? { up: 0, down: 0 };
        if (r.kind === 'up') t.up += 1;
        else if (r.kind === 'down') t.down += 1;
        tallies.set(r.slug, t);
      }
    }
    // reactErr is non-fatal — we just omit counts and let the UI hide them.
  }

  const items = rows.map((row) => {
    const snaps: SnapLike[] = Array.isArray(row.snaps) ? (row.snaps as SnapLike[]) : [];
    const winner = snaps.find((s) => s.id === row.winner_id) ?? null;
    const tally = tallies.get(row.slug as string) ?? { up: 0, down: 0 };
    return {
      slug: row.slug,
      winnerName: typeof winner?.name === 'string' ? winner.name.slice(0, 120) : null,
      winnerStore: typeof winner?.store === 'string' ? String(winner.store).slice(0, 40) : null,
      n: snaps.length,
      priority: row.priority,
      locale: row.locale,
      createdAt: row.created_at,
      up: tally.up,
      down: tally.down,
    };
  });
  return NextResponse.json(
    { items },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
