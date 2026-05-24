/**
 * POST /api/track
 * Body: { id, at, productId, store, tag, score, fromVerdict, q }
 *
 * Phase G stub: validates the payload and logs to stdout. Phase H wires this
 * into a real analytics pipeline (Tinybird / BigQuery via Vercel Edge Config).
 *
 * No cookies, no IP capture beyond what Vercel already records for /api routes.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const STORE = z.enum([
  'Coupang',
  'Amazon',
  'eBay',
  'Shopee',
  'Lazada',
  'NaverShopping',
  'AliExpress',
  'Gmarket',
  '11st',
  'TikTokShop',
  'GoogleShopping',
]);
const TAG = z.enum(['best', 'cheap', 'fast', 'genuine', 'value', 'alt', 'not']);

const Body = z.object({
  id: z.string().min(1).max(64),
  at: z.number().int().positive(),
  productId: z.string().min(1).max(200),
  store: STORE,
  tag: TAG,
  score: z.number().min(0).max(100),
  fromVerdict: z.boolean(),
  q: z.string().min(0).max(500),
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
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  // Phase G: print-only. Phase H plugs this into a real analytics sink.
  // eslint-disable-next-line no-console
  console.log('[track]', JSON.stringify(parsed.data));
  return NextResponse.json({ ok: true });
}
