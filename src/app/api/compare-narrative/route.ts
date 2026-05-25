/**
 * POST /api/compare-narrative
 *
 * Body: NarrativeInput-compatible shape (see lib/compare/llm-narrative.ts).
 * Returns: NarrativeResult — { narrative, source }.
 *
 * Provider order: Anthropic → OpenAI → deterministic fallback. Always 200.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { compareNarrative } from '@/lib/compare/llm-narrative';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Candidate = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(400),
  store: z.string().min(1).max(60),
  priceUsd: z.number().nullable(),
  priceLabel: z.string().max(80),
  shipDays: z.number().int().min(0).max(120).nullable(),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().min(0).max(10_000_000).nullable(),
  authenticityPct: z.number().min(0).max(100).nullable(),
  official: z.boolean(),
  tonyScore: z.number().min(0).max(100).nullable(),
  isWinner: z.boolean(),
});

const Body = z.object({
  locale: z.enum(['ko', 'en', 'vi']),
  priority: z.enum(['balanced', 'value', 'fast', 'genuine']),
  reasonKeys: z.array(z.string().max(40)).max(5),
  candidates: z.array(Candidate).min(1).max(8),
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
  const result = await compareNarrative(parsed.data);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
  });
}
