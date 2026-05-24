/**
 * POST /api/review-summary
 *
 * Body: {
 *   productName: string,
 *   store: string,
 *   rating: number,
 *   reviewCount: number,
 *   authenticityPct: number,
 *   reviewSamples: string[],
 *   locale: 'ko' | 'en' | 'vi'
 * }
 *
 * Returns ReviewAnalysis (see lib/llm.ts).
 *
 * Provider order: Anthropic → OpenAI → heuristic. Always succeeds.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeReviews } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  productName: z.string().min(1).max(300),
  store: z.string().min(1).max(60),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0).max(10_000_000),
  authenticityPct: z.number().min(0).max(100),
  reviewSamples: z.array(z.string().max(800)).max(20),
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
  const analysis = await analyzeReviews(parsed.data);
  return NextResponse.json(analysis, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  });
}
