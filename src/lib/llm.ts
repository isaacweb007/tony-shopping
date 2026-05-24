/**
 * Single-purpose LLM helper for review analysis.
 *
 * We avoid SDK dependencies and just hit the HTTPS endpoints. Provider order:
 *   1) Anthropic Messages API   (ANTHROPIC_API_KEY)
 *   2) OpenAI Chat Completions  (OPENAI_API_KEY)
 *   3) Heuristic fallback       (no key)
 *
 * The contract is identical regardless of provider so callers never branch.
 */
import 'server-only';

export interface ReviewAnalysis {
  /** One-sentence verdict in the user's locale (model is given the locale). */
  summary: string;
  /** Top positive points (1–3). */
  positives: string[];
  /** Top negative points (1–3). */
  negatives: string[];
  /** 0..100; higher = more likely organic, lower = bot-flavored. */
  authenticityScore: number;
  /** Which path produced this analysis. */
  source: 'anthropic' | 'openai' | 'heuristic';
}

interface LlmInput {
  productName: string;
  store: string;
  rating: number;
  reviewCount: number;
  authenticityPct: number;
  reviewSamples: string[];
  locale: 'ko' | 'en' | 'vi';
}

const SYSTEM_PROMPT = `You are Tony, an AI meta-shopping agent. You read a small sample of reviews and produce a short, decisive analysis to help a buyer avoid Hamlet syndrome. Be specific. Never invent facts not in the reviews. Detect bot-flavored reviews (short / repeated / formulaic) and discount them.

Always answer as compact JSON matching:
{
  "summary": string (one sentence in the user's locale),
  "positives": string[] (1-3 items, each a single short phrase),
  "negatives": string[] (1-3 items, each a single short phrase),
  "authenticityScore": number (0-100, 0 = mostly bots, 100 = highly organic)
}
No markdown. No commentary outside JSON.`;

function buildUserPrompt(input: LlmInput): string {
  const lines = [
    `Product: ${input.productName}`,
    `Store: ${input.store}`,
    `Rating: ${input.rating} / 5`,
    `Review count: ${input.reviewCount}`,
    `Merchant-reported authenticity hint: ${input.authenticityPct}%`,
    `Reply in locale: ${input.locale}`,
    '',
    'Review samples (one per line):',
    ...input.reviewSamples.map((r, i) => `${i + 1}. ${r}`),
  ];
  return lines.join('\n');
}

function parseJsonish(raw: string): Omit<ReviewAnalysis, 'source'> | null {
  // Find the first {...} block — tolerates markdown fences or prefix text.
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return {
      summary: String(json.summary ?? '').slice(0, 400),
      positives: Array.isArray(json.positives)
        ? (json.positives as unknown[]).slice(0, 5).map((s) => String(s).slice(0, 120))
        : [],
      negatives: Array.isArray(json.negatives)
        ? (json.negatives as unknown[]).slice(0, 5).map((s) => String(s).slice(0, 120))
        : [],
      authenticityScore: Math.max(0, Math.min(100, Number(json.authenticityScore ?? 0))),
    };
  } catch {
    return null;
  }
}

async function callAnthropic(input: LlmInput, key: string): Promise<ReviewAnalysis | null> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(input) }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? []).find((c) => c.type === 'text')?.text;
    if (!text) return null;
    const parsed = parseJsonish(text);
    if (!parsed) return null;
    return { ...parsed, source: 'anthropic' };
  } catch {
    return null;
  }
}

async function callOpenAI(input: LlmInput, key: string): Promise<ReviewAnalysis | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseJsonish(text);
    if (!parsed) return null;
    return { ...parsed, source: 'openai' };
  } catch {
    return null;
  }
}

function heuristic(input: LlmInput): ReviewAnalysis {
  // Fallback: derive a passable verdict from the samples + metadata so the UI
  // is never empty, even with no LLM key configured.
  const samples = input.reviewSamples ?? [];
  const shortBotCount = samples.filter((s) => s.length < 15).length;
  const totalDup = samples.length - new Set(samples.map((s) => s.toLowerCase())).size;
  const botPenalty = Math.min(60, shortBotCount * 6 + totalDup * 8);

  const baseAuth = Math.round(
    (input.authenticityPct * 0.6) + ((input.rating / 5) * 100 * 0.4),
  );
  const authenticityScore = Math.max(0, Math.min(100, baseAuth - botPenalty));

  const i18n = {
    ko: {
      good: '디자인 만족',
      fast: '배송 빠름',
      reorder: '재구매 의사 있음',
      sizing: '사이즈 주의',
      packaging: '포장 아쉬움',
      bots: '봇 리뷰 의심',
      verdict: `평점 ${input.rating}/5, 리뷰 ${input.reviewCount.toLocaleString()}개. 봇 의심도 ${botPenalty}%.`,
    },
    en: {
      good: 'Design satisfaction',
      fast: 'Fast shipping',
      reorder: 'Would re-buy',
      sizing: 'Sizing runs small',
      packaging: 'Packaging issues',
      bots: 'Possible bot reviews',
      verdict: `Rated ${input.rating}/5 across ${input.reviewCount.toLocaleString()} reviews. Bot suspicion ${botPenalty}%.`,
    },
    vi: {
      good: 'Thiết kế ổn',
      fast: 'Giao nhanh',
      reorder: 'Sẽ mua lại',
      sizing: 'Lưu ý size',
      packaging: 'Đóng gói chưa tốt',
      bots: 'Nghi ngờ đánh giá bot',
      verdict: `Đánh giá ${input.rating}/5, ${input.reviewCount.toLocaleString()} lượt. Nghi bot ${botPenalty}%.`,
    },
  } as const;
  const t = i18n[input.locale] ?? i18n.en;

  const positives: string[] = [t.good];
  if (input.rating >= 4.3) positives.push(t.reorder);
  if (input.authenticityPct >= 85) positives.push(t.fast);

  const negatives: string[] = [];
  if (shortBotCount >= 3) negatives.push(t.bots);
  if (input.rating < 4.2) negatives.push(t.sizing);
  if (input.authenticityPct < 70) negatives.push(t.packaging);

  return {
    summary: t.verdict,
    positives: positives.slice(0, 3),
    negatives: negatives.slice(0, 3),
    authenticityScore,
    source: 'heuristic',
  };
}

export async function analyzeReviews(input: LlmInput): Promise<ReviewAnalysis> {
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  if (anthropic) {
    const r = await callAnthropic(input, anthropic);
    if (r) return r;
  }
  if (openai) {
    const r = await callOpenAI(input, openai);
    if (r) return r;
  }
  return heuristic(input);
}
