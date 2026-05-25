/**
 * POST /api/cohort/create
 *
 * Body: { snaps: ShortlistSnap[], winnerId?: string, priority?, locale? }
 * Returns: { slug }
 *
 * Requires Supabase configured + an authenticated session. When either is
 * missing we return 503 with a friendly hint and the client falls back to
 * the longer /compare?ids=... URL.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MoneySchema = z.object({
  amount: z.number().int().min(0),
  currency: z.enum(['KRW', 'USD', 'VND', 'JPY']),
});

const SnapSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(400),
  store: z.string().min(1).max(60),
  imageUrl: z.string().max(2000).optional(),
  buyUrl: z.string().max(2000).optional(),
  finalPrice: MoneySchema,
  shipDays: z.number().int().min(0).max(120).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).max(10_000_000).optional(),
  authenticityPct: z.number().min(0).max(100).optional(),
  official: z.boolean().optional(),
  tag: z.string().max(20).optional(),
  score: z
    .object({
      total: z.number().min(0).max(100),
      similarity: z.number().min(0).max(100),
      priceEdge: z.number().min(0).max(100),
      reviewTrust: z.number().min(0).max(100),
      authenticity: z.number().min(0).max(100),
    })
    .optional(),
  addedAt: z.number().int().min(0),
});

const Body = z.object({
  snaps: z.array(SnapSchema).min(2).max(8),
  winnerId: z.string().max(200).optional(),
  priority: z.enum(['balanced', 'value', 'fast', 'genuine']).optional(),
  locale: z.enum(['ko', 'en', 'vi']).optional(),
});

export async function POST(req: Request) {
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

  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'supabase_unconfigured', hint: 'short_link_unavailable' },
      { status: 503 },
    );
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Strip buyUrl from snaps before persistence — affiliate-tagged URLs are
  // user-scoped and shouldn't leak across accounts.
  const sanitised = parsed.data.snaps.map(({ buyUrl: _buyUrl, ...rest }) => rest);

  // 8-char slug from URL-safe alphabet. Collisions at this size are
  // ~negligible (32^8 ≈ 1.1 trillion); we don't loop-retry on conflict.
  const slug = nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, 'a');

  const { error: insertErr } = await supabase.from('cohort_shares').insert({
    slug,
    user_id: userData.user.id,
    snaps: sanitised,
    winner_id: parsed.data.winnerId ?? null,
    priority: parsed.data.priority ?? 'balanced',
    locale: parsed.data.locale ?? 'ko',
  });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ slug });
}
