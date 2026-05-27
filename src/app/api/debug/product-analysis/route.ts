/**
 * Diagnostic endpoint for the Claude product-analysis pipeline.
 *
 * Returns the raw model text alongside the parsed result so we can see
 * exactly what Claude is saying when the parser falls back to the
 * heuristic path. Never returns the API key.
 *
 * GET /api/debug/product-analysis?q=Sony+WH-1000XM5
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';

const SYSTEM_PROMPT = `You are Tony, an AI meta-shopping agent. From a single product's catalog row, produce a depth analysis that helps the buyer decide with confidence. You DO NOT have access to the product page itself — you must infer specs from the product name + brand context using your training knowledge, and be honest when you don't know.

Always answer in the user's locale (ko / en / vi) as strict JSON matching:
{
  "summary": "one sentence about what this product is and who it's for",
  "specs": ["spec 1 short", "spec 2 short", "..."],
  "authenticity": {
    "level": "high" | "medium" | "low",
    "signals": ["reason 1", "reason 2", "..."]
  },
  "buyingTips": ["thing to verify 1", "..."],
  "differentiators": ["vs prior model / alternative"]
}

Reply with ONLY the JSON. No code fences, no prose.`;

export async function GET(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, reason: 'ANTHROPIC_API_KEY not set' });
  }
  const q = req.nextUrl.searchParams.get('q') || 'Sony WH-1000XM5 무선 헤드폰';

  const userMsg = JSON.stringify({
    locale: 'ko',
    product: {
      name: q,
      store: '소니스토어',
      price: 519000,
      currency: 'KRW',
      rating: 4.7,
      reviewCount: 26000,
      authenticityHeuristic: 88,
      isOfficialStoreFlag: true,
      shipDays: 1,
      otherMerchantPrices: [],
    },
  });

  const t0 = Date.now();
  let httpStatus = 0;
  let rawText = '';
  let apiError: unknown = null;
  let bodyOnError = '';

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
      cache: 'no-store',
    });
    httpStatus = res.status;
    if (!res.ok) {
      bodyOnError = (await res.text().catch(() => '')).slice(0, 600);
    } else {
      const data = (await res.json()) as {
        content?: Array<{ type?: string; text?: string }>;
        error?: { type?: string; message?: string };
      };
      apiError = data.error ?? null;
      rawText = data.content?.find((c) => c.type === 'text')?.text ?? '';
    }
  } catch (e) {
    apiError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(
    {
      durationMs: Date.now() - t0,
      httpStatus,
      apiError,
      bodyOnError,
      keyTail: '...' + key.slice(-4),
      rawTextFirst300: rawText.slice(0, 300),
      rawTextLength: rawText.length,
    },
    { status: 200 },
  );
}
