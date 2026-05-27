/**
 * Claude-powered product depth analysis.
 *
 * Catalog APIs (SerpAPI, Naver, Rakuten) give us title / price / rating /
 * source / thumbnail — not enough for Tony to act like a real shopping
 * agent. This module asks Claude to fill that depth gap from what little
 * data we have:
 *
 *   - Spec highlights inferred from the product name (e.g. "Sony
 *     WH-1000XM5" → 노이즈캔슬링, 무선, 30시간 배터리)
 *   - Authenticity signals (price reasonable? known merchant? official
 *     store flag?)
 *   - Buying considerations (compatibility, warranty, what to verify)
 *   - Differentiators vs prior-gen / nearby alternatives
 *
 * Strict JSON output. Never invents prices or measurements that weren't
 * either in the input or that Claude is confident about from training.
 */
import 'server-only';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';

export interface ProductAnalysis {
  /** Short product summary (1 sentence, locale-aware). */
  summary: string;
  /** Likely key specs Claude inferred. 3–6 bullet points. */
  specs: string[];
  /** Authenticity assessment. */
  authenticity: {
    /** "high" | "medium" | "low" */
    level: 'high' | 'medium' | 'low';
    /** Concrete signals that drove the level. 2–4 lines. */
    signals: string[];
  };
  /** Things the buyer should verify before clicking buy. 2–4 lines. */
  buyingTips: string[];
  /** Comparisons to alternatives or prior generations. 1–3 lines. */
  differentiators: string[];
  /** Provider that produced this. */
  source: 'anthropic' | 'fallback';
}

interface AnalysisInput {
  productName: string;
  store: string;
  /** Final price as displayed (incl. shipping). */
  price: number;
  currency: 'KRW' | 'USD' | 'VND' | 'JPY';
  rating: number;
  reviewCount: number;
  authenticityPct: number;
  official: boolean;
  shipDays: number;
  locale: 'ko' | 'en' | 'vi';
  /** When the clusterer found sibling merchants for this product, surface
      their merchant names here so Claude can comment on price spread. */
  otherMerchantPrices?: Array<{ merchant: string; price: number }>;
}

const SYSTEM_PROMPT = `You are Tony, an AI meta-shopping agent. From a single product's catalog row, produce a depth analysis that helps the buyer decide with confidence. You DO NOT have access to the product page itself — you must infer specs from the product name + brand context using your training knowledge, and be honest when you don't know.

Always answer in the user's locale (ko / en / vi) as strict JSON matching:
{
  "summary": "one sentence about what this product is and who it's for",
  "specs": ["spec 1 short", "spec 2 short", "..."],   // 3–6 items, factual
  "authenticity": {
    "level": "high" | "medium" | "low",
    "signals": ["reason 1", "reason 2", "..."]         // 2–4 items
  },
  "buyingTips": ["thing to verify 1", "..."],          // 2–4 items
  "differentiators": ["vs prior model / alternative"]  // 1–3 items
}

Rules:
- Never invent prices, dimensions, weights you don't know. Use "확인 필요" / "verify" instead.
- For authenticity level:
  - "high" = well-known brand at a brand-store / known authenticator (KREAM, Apple, Sony, etc.) at a reasonable price.
  - "medium" = recognised reseller, price within market range.
  - "low" = unfamiliar reseller OR price suspiciously below market OR no brand signal.
- Specs must be specific and useful (a buyer would want to know). No "great quality" filler.
- Buying tips should be ACTIONABLE (verify serial, check warranty region, confirm bundled accessories).
- Reply with ONLY the JSON. No code fences, no prose.`;

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
}

export async function analyzeProduct(input: AnalysisInput): Promise<ProductAnalysis> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallbackAnalysis(input);

  const userMsg = JSON.stringify({
    locale: input.locale,
    product: {
      name: input.productName,
      store: input.store,
      price: input.price,
      currency: input.currency,
      rating: input.rating,
      reviewCount: input.reviewCount,
      authenticityHeuristic: input.authenticityPct,
      isOfficialStoreFlag: input.official,
      shipDays: input.shipDays,
      otherMerchantPrices: input.otherMerchantPrices ?? [],
    },
  });

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
        // Deterministic output so the same product analysis is stable across
        // refreshes — a shopping agent that flip-flops on its recommendation
        // loses trust.
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[Product analysis] non-ok', res.status);
      return fallbackAnalysis(input);
    }
    const data = (await res.json()) as ClaudeResponse;
    if (data.error) {
      console.error('[Product analysis] api error', data.error);
      return fallbackAnalysis(input);
    }
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
    return parseAnalysis(text) ?? fallbackAnalysis(input);
  } catch (e) {
    console.error('[Product analysis] threw', e instanceof Error ? e.message : e);
    return fallbackAnalysis(input);
  }
}

function parseAnalysis(text: string): ProductAnalysis | null {
  let body = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!body.startsWith('{')) {
    const s = body.indexOf('{');
    const e = body.lastIndexOf('}');
    if (s >= 0 && e > s) body = body.slice(s, e + 1);
    else return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<ProductAnalysis> & {
    authenticity?: { level?: string; signals?: unknown };
  };

  const specs = Array.isArray(r.specs) ? r.specs.filter((s): s is string => typeof s === 'string').slice(0, 6) : [];
  const buyingTips = Array.isArray(r.buyingTips) ? r.buyingTips.filter((s): s is string => typeof s === 'string').slice(0, 4) : [];
  const diff = Array.isArray(r.differentiators) ? r.differentiators.filter((s): s is string => typeof s === 'string').slice(0, 3) : [];
  const authLevel: 'high' | 'medium' | 'low' =
    r.authenticity?.level === 'high' || r.authenticity?.level === 'medium' || r.authenticity?.level === 'low'
      ? r.authenticity.level
      : 'medium';
  const authSignals = Array.isArray(r.authenticity?.signals)
    ? r.authenticity!.signals.filter((s): s is string => typeof s === 'string').slice(0, 4)
    : [];

  if (!r.summary || typeof r.summary !== 'string') return null;
  return {
    summary: r.summary.trim(),
    specs,
    authenticity: { level: authLevel, signals: authSignals },
    buyingTips,
    differentiators: diff,
    source: 'anthropic',
  };
}

/**
 * Deterministic fallback when no LLM is reachable. Surfaces the heuristic
 * signals we DO have from the catalog row so the UI never shows an empty
 * analysis panel — but explicitly labels itself "fallback" so the consumer
 * knows the depth is limited.
 */
function fallbackAnalysis(input: AnalysisInput): ProductAnalysis {
  const ko = input.locale === 'ko';
  const en = input.locale === 'en';
  const tier =
    input.authenticityPct >= 80 ? 'high' : input.authenticityPct >= 60 ? 'medium' : 'low';
  const signals: string[] = [];
  if (input.official) {
    signals.push(ko ? '공식 판매처 표시됨' : en ? 'Marked as official store' : 'Đánh dấu cửa hàng chính thức');
  }
  if (input.reviewCount > 1000) {
    signals.push(
      ko
        ? `리뷰 ${input.reviewCount.toLocaleString()}개로 풍부`
        : en
          ? `${input.reviewCount.toLocaleString()} reviews — solid sample`
          : `${input.reviewCount.toLocaleString()} đánh giá — đủ tin cậy`,
    );
  }
  return {
    summary: ko
      ? `${input.productName.slice(0, 50)} — ${input.store} 판매`
      : en
        ? `${input.productName.slice(0, 50)} — sold by ${input.store}`
        : `${input.productName.slice(0, 50)} — bán bởi ${input.store}`,
    specs: [],
    authenticity: { level: tier, signals },
    buyingTips: [
      ko ? '구매 전 매장 정품 보증 확인' : en ? 'Verify warranty before purchase' : 'Xác minh bảo hành trước khi mua',
    ],
    differentiators: [],
    source: 'fallback',
  };
}
