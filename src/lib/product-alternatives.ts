/**
 * Claude-powered alternative product suggestions.
 *
 * The verdict card answers "which one of these". Smart alternatives
 * answers "what else should I be considering" — i.e. the question a
 * real shopping agent thinks about for you. Claude is given the
 * canonical product and returns 3 named alternatives spanning three
 * canonical buying angles:
 *
 *   1. Same class, different brand (head-to-head competitor)
 *   2. Prior generation (cheaper, often acceptable for casual use)
 *   3. Cheaper tier (budget pick at a different price point)
 *
 * Each alternative comes with a one-line "why this might be for you"
 * reason, and a stable category tag so the UI can color-code the rail.
 *
 * Falls back to an empty list when ANTHROPIC_API_KEY is missing or
 * Claude is unreachable — the rail then renders nothing rather than
 * showing wrong data.
 */
import 'server-only';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';
const TIMEOUT_MS = 6000;

export type AlternativeAngle = 'competitor' | 'prior_gen' | 'budget' | 'premium';

export interface ProductAlternative {
  /** Concrete product name a user could paste into a shopping search. */
  name: string;
  /** One-line "why this is worth a look" in the user's locale. */
  reason: string;
  /** Stable angle tag for UI coloring + sorting. */
  angle: AlternativeAngle;
}

export interface AlternativesResult {
  alternatives: ProductAlternative[];
  /** Provider that produced this. */
  source: 'anthropic' | 'fallback';
}

interface Input {
  productName: string;
  store: string;
  price: number;
  currency: 'KRW' | 'USD' | 'VND' | 'JPY';
  locale: 'ko' | 'en' | 'vi';
}

const SYSTEM_PROMPT = `You are Tony, an AI meta-shopping agent. The user is looking at a specific product. Your job is to suggest 3 ALTERNATIVE products they should also consider — the kind of "have you thought about this?" prompting a smart in-store assistant would do.

Pick alternatives along these angles when relevant:
- "competitor": same class, different brand at a similar price (head-to-head rival)
- "prior_gen": the previous generation of the same product (cheaper, often 80% of the experience)
- "budget": a meaningfully cheaper option at lower spec tier
- "premium": a step-up option for buyers who'd pay more for clearly better

Always answer in the user's locale (ko / en / vi) as strict JSON:
{
  "alternatives": [
    {
      "name": "concrete product name a user could search for",
      "reason": "one short sentence why this is worth considering",
      "angle": "competitor" | "prior_gen" | "budget" | "premium"
    },
    ...
  ]
}

Rules:
- EXACTLY 3 alternatives. Diverse angles preferred (don't return 3 competitors).
- "name" must be a real, searchable product (e.g. "Bose QuietComfort 45", not "another good headphone").
- "reason" must be specific and useful (e.g. "더 긴 배터리와 더 가벼운 무게" not "좋아요").
- Never recommend the SAME product the user is looking at, or an exact accessory of it (case, charger, ear tip).
- If the input product is generic (e.g. just "여행용 가방") and you can't confidently suggest specific alternatives, return fewer (1 or 2) rather than inventing.
- Reply with ONLY the JSON. No code fences, no prose.`;

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
}

export async function suggestAlternatives(input: Input): Promise<AlternativesResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { alternatives: [], source: 'fallback' };

  const userMsg = JSON.stringify({
    locale: input.locale,
    product: {
      name: input.productName,
      store: input.store,
      price: input.price,
      currency: input.currency,
    },
  });

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        // Deterministic so the same product always gets the same
        // alternatives — refreshing the page can't flip Tony's
        // suggestions around.
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Alternatives] non-ok', res.status, body.slice(0, 200));
      return { alternatives: [], source: 'fallback' };
    }
    const data = (await res.json()) as ClaudeResponse;
    if (data.error) {
      console.error('[Alternatives] api error', data.error);
      return { alternatives: [], source: 'fallback' };
    }
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
    const parsed = parseAlternatives(text);
    if (!parsed) {
      console.error('[Alternatives] parse failed. raw:', text.slice(0, 300));
      return { alternatives: [], source: 'fallback' };
    }
    return { alternatives: parsed, source: 'anthropic' };
  } catch (e) {
    console.error('[Alternatives] threw', e instanceof Error ? e.message : e);
    return { alternatives: [], source: 'fallback' };
  }
}

function parseAlternatives(text: string): ProductAlternative[] | null {
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
  const list = (raw as { alternatives?: unknown }).alternatives;
  if (!Array.isArray(list)) return null;

  const validAngles: AlternativeAngle[] = ['competitor', 'prior_gen', 'budget', 'premium'];
  const cleaned: ProductAlternative[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const it = item as Partial<ProductAlternative>;
    if (typeof it.name !== 'string' || it.name.trim().length < 3) continue;
    if (typeof it.reason !== 'string' || it.reason.trim().length < 3) continue;
    const angle: AlternativeAngle = validAngles.includes(it.angle as AlternativeAngle)
      ? (it.angle as AlternativeAngle)
      : 'competitor';
    cleaned.push({
      name: it.name.trim().slice(0, 120),
      reason: it.reason.trim().slice(0, 200),
      angle,
    });
    if (cleaned.length >= 3) break;
  }
  return cleaned;
}
