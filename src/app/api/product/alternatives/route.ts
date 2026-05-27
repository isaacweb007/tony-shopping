/**
 * POST /api/product/alternatives
 *
 * Returns Claude-suggested alternative products for a given product.
 * Used by the AlternativesRail under the verdict card.
 *
 * Edge-cached 1 hour by full body so 100 users searching the same hit
 * product cost one LLM call.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { suggestAlternatives } from '@/lib/product-alternatives';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  productName: z.string().min(1).max(300),
  store: z.string().min(1).max(60),
  price: z.number().nonnegative(),
  currency: z.enum(['KRW', 'USD', 'VND', 'JPY']),
  locale: z.enum(['ko', 'en', 'vi']),
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

  const result = await suggestAlternatives(parsed.data);
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
