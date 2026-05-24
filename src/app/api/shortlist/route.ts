/**
 * GET    /api/shortlist           — list current user's compare items
 * POST   /api/shortlist           — upsert a single item
 * DELETE /api/shortlist?id=...    — delete a single item
 *
 * All operations require an authenticated Supabase session. Without auth, the
 * endpoint returns 401 and the client keeps using LocalStorage.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ItemSchema = z.object({
  productId: z.string().min(1).max(200),
  name: z.string().min(1).max(400),
  store: z.string().min(1).max(60),
  priceAmount: z.number().int().min(0),
  priceCurrency: z.string().min(1).max(8),
  imageUrl: z.string().max(2000).optional(),
  buyUrl: z.string().max(2000).optional(),
  tonyScore: z.number().int().min(0).max(100).optional(),
});

async function requireUser() {
  const supabase = await getServerClient();
  if (!supabase) return { error: 'supabase_unconfigured' as const, supabase: null, user: null };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { error: 'unauthorized' as const, supabase, user: null };
  return { error: null, supabase, user: data.user };
}

export async function GET() {
  const ctx = await requireUser();
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return NextResponse.json({ error: ctx.error ?? 'unauthorized' }, { status: 401 });
  }
  const { data, error } = await ctx.supabase
    .from('shortlist')
    .select('product_id, name, store, price_amount, price_currency, image_url, buy_url, tony_score, added_at')
    .eq('user_id', ctx.user.id)
    .order('added_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return NextResponse.json({ error: ctx.error ?? 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = ItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }
  const row = {
    user_id: ctx.user.id,
    product_id: parsed.data.productId,
    name: parsed.data.name,
    store: parsed.data.store,
    price_amount: parsed.data.priceAmount,
    price_currency: parsed.data.priceCurrency,
    image_url: parsed.data.imageUrl ?? null,
    buy_url: parsed.data.buyUrl ?? null,
    tony_score: parsed.data.tonyScore ?? null,
  };
  const { error } = await ctx.supabase.from('shortlist').upsert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await requireUser();
  if (ctx.error || !ctx.supabase || !ctx.user) {
    return NextResponse.json({ error: ctx.error ?? 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const { error } = await ctx.supabase
    .from('shortlist')
    .delete()
    .eq('user_id', ctx.user.id)
    .eq('product_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
