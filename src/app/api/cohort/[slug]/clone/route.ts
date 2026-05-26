/**
 * POST /api/cohort/[slug]/clone
 *
 * Increments the public clones counter for a shared cohort. Anonymous —
 * no auth required, no body required. Returns the updated total.
 *
 * The bump is server-trusted via a SECURITY DEFINER RPC because anon
 * users don't have direct UPDATE on cohort_shares (RLS denies it).
 * Rate-limiting is intentionally NOT enforced here: we lean on the
 * client-side dedupe (a slug already in my-shares-store doesn't fire
 * the bump twice) and the social proof framing — a few inflated taps
 * are noise, not abuse.
 *
 * 404 when slug doesn't exist; 503 when Supabase isn't configured.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9]{1,16}$/;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }
  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_unconfigured', clones: 0 }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('increment_cohort_clones', { p_slug: slug });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (data == null) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ clones: data });
}
