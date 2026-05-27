/**
 * POST /api/product/analysis
 *
 * Claude-powered deep analysis of a single product, used by the product
 * detail page and the verdict card to surface specs / authenticity
 * signals / buying tips / differentiators that aren't in the raw catalog
 * row.
 *
 * Body: see Body schema below.
 * Returns: ProductAnalysis from lib/product-analysis.ts.
 *
 * Always succeeds — falls back to a deterministic heuristic when the
 * Claude key is missing or the API throws.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeProduct } from '@/lib/product-analysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  productName: z.string().min(1).max(300),
  store: z.string().min(1).max(60),
  price: z.number().nonnegative(),
  currency: z.enum(['KRW', 'USD', 'VND', 'JPY']),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0).max(10_000_000),
  authenticityPct: z.number().min(0).max(100),
  official: z.boolean(),
  shipDays: z.number().int().min(0).max(60),
  locale: z.enum(['ko', 'en', 'vi']),
  otherMerchantPrices: z
    .array(z.object({ merchant: z.string().max(80), price: z.number().nonnegative() }))
    .max(8)
    .optional(),
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

  const analysis = await analyzeProduct(parsed.data);
  return NextResponse.json(analysis, {
    headers: {
      // 1-hour edge cache by full body hash. The same product re-rendered
      // 50 times costs us 1 Claude call.
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
