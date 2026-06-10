/**
 * GET /api/alerts — the signed-in user's server-recorded price observations,
 * shaped to merge straight into the client price-watch timeline.
 *
 * These are the moves Tony's cron caught while the user was away. The client
 * merges them with its per-device timeline so /alerts and the unread badge
 * reflect both. Returns 401 without auth — the client keeps LocalStorage-only.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_CURRENCIES = new Set(['KRW', 'USD', 'VND', 'JPY']);

interface ObsRow {
  product_id: string;
  price_amount: number;
  price_currency: string;
  observed_at: string;
}

export async function GET() {
  const supabase = await getServerClient();
  if (!supabase) return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 401 });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('price_observations')
    .select('product_id, price_amount, price_currency, observed_at')
    .eq('user_id', userData.user.id)
    .order('observed_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group into per-product timelines (entries oldest → newest).
  const byProduct = new Map<string, { currency: string; entries: Array<{ at: number; amount: number }> }>();
  for (const row of (data ?? []) as ObsRow[]) {
    const at = Date.parse(row.observed_at);
    if (!Number.isFinite(at)) continue;
    const currency = ALLOWED_CURRENCIES.has(row.price_currency) ? row.price_currency : 'USD';
    const existing = byProduct.get(row.product_id);
    if (existing) {
      existing.entries.push({ at, amount: row.price_amount });
      existing.currency = currency; // most-recent row wins (already asc-ordered)
    } else {
      byProduct.set(row.product_id, { currency, entries: [{ at, amount: row.price_amount }] });
    }
  }

  const observations = Array.from(byProduct.entries()).map(([productId, v]) => ({
    productId,
    currency: v.currency,
    entries: v.entries,
  }));

  return NextResponse.json({ observations });
}
