/**
 * GET  /api/cohort/[slug]/react  → { up, down, you?: 'up'|'down'|null }
 * POST /api/cohort/[slug]/react  → body { voterHash, kind: 'up'|'down'|null }
 *
 * Anonymous tally for a shared cohort. One row per (slug, voterHash). POST
 * with kind=null retracts the voter's reaction. Falls back to 503 with a
 * helpful payload when Supabase isn't configured so the UI degrades.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9]{1,16}$/;

const PostBody = z.object({
  voterHash: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  kind: z.enum(['up', 'down']).nullable(),
});

interface CtxParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: Request, ctx: CtxParams) {
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }
  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'supabase_unconfigured', up: 0, down: 0, you: null },
      { status: 503 },
    );
  }

  const voterHash = new URL(req.url).searchParams.get('voterHash') ?? '';
  const { data, error } = await supabase
    .from('cohort_reactions')
    .select('voter_hash, kind')
    .eq('slug', slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let up = 0;
  let down = 0;
  let you: 'up' | 'down' | null = null;
  for (const row of data ?? []) {
    if (row.kind === 'up') up += 1;
    if (row.kind === 'down') down += 1;
    if (voterHash && row.voter_hash === voterHash) you = row.kind as 'up' | 'down';
  }
  return NextResponse.json(
    { up, down, you },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: Request, ctx: CtxParams) {
  const { slug } = await ctx.params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }
  let parsed;
  try {
    parsed = PostBody.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await getServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'supabase_unconfigured' }, { status: 503 });
  }

  if (parsed.data.kind === null) {
    // Retract a vote
    const { error } = await supabase
      .from('cohort_reactions')
      .delete()
      .eq('slug', slug)
      .eq('voter_hash', parsed.data.voterHash);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Upsert (slug, voter_hash) — primary key handles dedupe; kind is the new value.
  const { error } = await supabase
    .from('cohort_reactions')
    .upsert(
      { slug, voter_hash: parsed.data.voterHash, kind: parsed.data.kind },
      { onConflict: 'slug,voter_hash' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
