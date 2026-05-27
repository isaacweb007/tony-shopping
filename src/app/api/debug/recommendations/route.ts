/**
 * Diagnostic endpoint for /api/recommendations. Returns the raw Claude
 * response so we can see why production was falling back. Never returns
 * the API key.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are Tony, an AI meta-shopping agent. The user has searched and clicked through a few products. Suggest 4 NEW products they should look at next.

Always answer in the user's locale (ko / en / vi) as strict JSON:
{
  "recommendations": [
    {"name": "specific searchable product", "reason": "one short sentence", "emoji": "🎧"}
  ]
}

Reply with ONLY the JSON. No prose, no code fences.`;

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, reason: 'no key' });
  }

  const userMsg = JSON.stringify({
    locale: 'ko',
    recentQueries: ['airpods pro 2', 'sony wh-1000xm5', '무드 조명'],
    recentClicks: [{ name: 'Sony WH-1000XM5 무선 헤드폰', query: 'sony wh-1000xm5' }],
  });

  const t0 = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json({
        httpStatus: res.status,
        bodyOnError: body.slice(0, 600),
        durationMs: Date.now() - t0,
      });
    }
    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      error?: { message?: string };
      stop_reason?: string;
    };
    const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
    return NextResponse.json({
      httpStatus: res.status,
      durationMs: Date.now() - t0,
      apiError: data.error ?? null,
      stopReason: data.stop_reason,
      rawTextLength: text.length,
      rawTextFirst500: text.slice(0, 500),
    });
  } catch (e) {
    return NextResponse.json({
      durationMs: Date.now() - t0,
      threw: e instanceof Error ? e.message : String(e),
    });
  }
}
