/**
 * GET /api/cohort/recent
 *
 * Returns publicly-shared cohorts so /compare's footer surfaces "what
 * other people are comparing right now" and the standalone /cohorts
 * gallery can paginate through the full set. PII-free: slug, winner
 * name + store (already public in the share payload), snap count,
 * priority, locale, createdAt, plus an aggregated up/down count
 * from cohort_reactions.
 *
 * Query params:
 *   ?limit  (1..20, default 5)
 *   ?offset (≥ 0, default 0)
 *
 * 503 when Supabase isn't configured — caller hides the section.
 */
import { type NextRequest, NextResponse } from 'next/server';
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

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

const PRIORITY_VALUES = new Set(['balanced', 'value', 'fast', 'genuine']);

export async function GET(req: NextRequest) {
  const limit = clampInt(req.nextUrl.searchParams.get('limit'), 1, 20, 5);
  const offset = clampInt(req.nextUrl.searchParams.get('offset'), 0, 500, 0);
  const priorityParam = req.nextUrl.searchParams.get('priority');
  const priority = priorityParam && PRIORITY_VALUES.has(priorityParam) ? priorityParam : null;

  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'supabase_unconfigured', items: [], total: 0 },
      { status: 503 },
    );
  }
  let q = supabase
    .from('cohort_shares')
    .select('slug, snaps, winner_id, priority, locale, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (priority) q = q.eq('priority', priority);
  const { data, error, count } = await q.range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message, items: [], total: 0 }, { status: 500 });

  const rows = data ?? [];
  const slugs = rows.map((r) => r.slug as string);

  // One join query for the visible page. Tally locally — way cheaper than
  // N aggregates and keeps the route under one DB round-trip per page.
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
    { items, total: count ?? items.length },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
