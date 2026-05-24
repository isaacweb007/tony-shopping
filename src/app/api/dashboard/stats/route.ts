/**
 * GET /api/dashboard/stats
 *
 * Returns the signed-in user's aggregated stats. When unauthenticated, returns
 * an empty payload so the client can still render its LocalStorage-only view.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface ServerStats {
  signedIn: boolean;
  searches: number;
  shortlist: number;
  clicks: number;
  /** Click count per store, descending. */
  storeBreakdown: Array<{ store: string; count: number }>;
  /** Click count grouped by tony tag (best/cheap/fast/...). */
  tagBreakdown: Array<{ tag: string; count: number }>;
  /** Total clicks that originated from the VerdictCard. */
  verdictClicks: number;
}

const EMPTY: ServerStats = {
  signedIn: false,
  searches: 0,
  shortlist: 0,
  clicks: 0,
  storeBreakdown: [],
  tagBreakdown: [],
  verdictClicks: 0,
};

export async function GET() {
  const supabase = await getServerClient();
  if (!supabase) return NextResponse.json(EMPTY);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json(EMPTY);

  const [{ count: searchCount }, { count: shortlistCount }, { data: clickRows, count: clicksCount }] =
    await Promise.all([
      supabase.from('history').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('shortlist').select('product_id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase
        .from('clicks')
        .select('store, tag, from_verdict', { count: 'exact' })
        .eq('user_id', user.id)
        .limit(1000),
    ]);

  const storeMap = new Map<string, number>();
  const tagMap = new Map<string, number>();
  let verdictClicks = 0;
  for (const r of clickRows ?? []) {
    storeMap.set(r.store, (storeMap.get(r.store) ?? 0) + 1);
    tagMap.set(r.tag, (tagMap.get(r.tag) ?? 0) + 1);
    if (r.from_verdict) verdictClicks += 1;
  }

  return NextResponse.json<ServerStats>({
    signedIn: true,
    searches: searchCount ?? 0,
    shortlist: shortlistCount ?? 0,
    clicks: clicksCount ?? 0,
    storeBreakdown: [...storeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([store, count]) => ({ store, count })),
    tagBreakdown: [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count })),
    verdictClicks,
  });
}
