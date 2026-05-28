/**
 * Claude-powered personalised product suggestions for the home page.
 *
 * Reads the user's recent search history (queries they typed) and click
 * history (products they actually engaged with) and asks Claude to
 * suggest 4 brand-new products to put in front of them. Unlike the
 * post-result "alternatives" feature, this fires WITHOUT a query — it's
 * pure "Tony noticed your taste, here's what to look at next".
 *
 * Privacy: only category-level + query strings + clicked product names
 * are sent to Claude. No IDs, no personal data.
 */
import 'server-only';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';
// Korean / Vietnamese responses observed at 5–8 seconds (verified via the
// trace endpoint). 6 s was occasionally aborting MID-RESPONSE, sending
// the route to fallback even when Claude was about to succeed. 12 s
// gives enough headroom for ko / vi without making the home page hang
// when Claude is genuinely unreachable.
const TIMEOUT_MS = 12000;

export type RecommendationCategory =
  | 'electronics'
  | 'fashion'
  | 'beauty'
  | 'home'
  | 'kitchen'
  | 'sports'
  | 'pet'
  | 'baby'
  | 'jewelry'
  | 'food'
  | 'other';

export interface PersonalRecommendation {
  /** Concrete product name a user could search for. */
  name: string;
  /** One-line "why this fits your interests" in the user's locale. */
  reason: string;
  /** Category tag the UI uses to pick a matching lucide icon. */
  category?: RecommendationCategory;
}

export interface PersonalResult {
  recommendations: PersonalRecommendation[];
  source: 'anthropic' | 'fallback';
}

export interface PersonalInput {
  /** Last few queries the user actually typed. Most-recent first. */
  recentQueries: string[];
  /** Products the user clicked through to. Most-recent first. */
  recentClicks: Array<{ name: string; query: string }>;
  locale: 'ko' | 'en' | 'vi';
}

const SYSTEM_PROMPT = `You are Tony, an AI meta-shopping agent. The user has searched and clicked through a few products. Suggest 4 NEW products they should look at next — products that fit the taste their recent activity shows.

Always answer in the user's locale (ko / en / vi) as strict JSON:
{
  "recommendations": [
    {
      "name": "specific searchable product (brand + model when known)",
      "reason": "one short sentence why this matches their pattern",
      "category": "electronics" | "fashion" | "beauty" | "home" | "kitchen" | "sports" | "pet" | "baby" | "jewelry" | "food" | "other"
    }
  ]
}

Guidelines (soft, not blockers):
- Aim for 4 recommendations. Spanning different categories the user touched is better than 4 similar items.
- Concrete product names ("Bose QuietComfort Ultra"), not vague ("good headphones").
- Reasons should be SHORT and reference the pattern ("최근 노이즈캔슬링을 봤으니 ...").
- Pick the most fitting category tag from the enumerated set. Use "other" only when none fits.
- DO NOT include emojis in the name, reason, or anywhere — the UI renders an icon based on category.
- Reply with ONLY the JSON. No prose, no code fences.`;

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
}

export async function suggestPersonal(input: PersonalInput): Promise<PersonalResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { recommendations: [], source: 'fallback' };
  // Empty signal → don't waste a call. Caller should already guard but be safe.
  if (input.recentQueries.length + input.recentClicks.length < 2) {
    return { recommendations: [], source: 'fallback' };
  }

  const userMsg = JSON.stringify({
    locale: input.locale,
    recentQueries: input.recentQueries.slice(0, 10),
    recentClicks: input.recentClicks.slice(0, 10),
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
        // 4 KR recommendations × (name + reason + emoji) easily clears 800
        // tokens and truncates mid-JSON — same lesson learned with product
        // analysis. 1500 gives headroom across ko/vi.
        max_tokens: 1500,
        temperature: 0.3, // Tiny variability so recommendations don't feel canned
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Personal] non-ok', res.status, body.slice(0, 200));
      return { recommendations: [], source: 'fallback' };
    }
    const data = (await res.json()) as ClaudeResponse;
    if (data.error) {
      console.error('[Personal] api error', data.error);
      return { recommendations: [], source: 'fallback' };
    }
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
    const parsed = parsePersonal(text);
    if (!parsed) {
      console.error('[Personal] parse failed. raw:', text.slice(0, 300));
      return { recommendations: [], source: 'fallback' };
    }
    return { recommendations: parsed, source: 'anthropic' };
  } catch (e) {
    console.error('[Personal] threw', e instanceof Error ? e.message : e);
    return { recommendations: [], source: 'fallback' };
  }
}

/**
 * Trace variant used by /api/recommendations?trace=1 — returns the
 * raw Claude text + parse intermediate state so we can see exactly
 * what's happening when prod inputs disagree with debug.
 */
export async function suggestPersonalWithTrace(input: PersonalInput): Promise<{
  result: PersonalResult;
  trace: {
    rawTextLength: number;
    rawTextFirst300: string;
    parseFailed: boolean;
    parseFailReason?: string;
    parsedCount?: number;
  };
}> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      result: { recommendations: [], source: 'fallback' },
      trace: { rawTextLength: 0, rawTextFirst300: '', parseFailed: true, parseFailReason: 'no key' },
    };
  }

  const userMsg = JSON.stringify({
    locale: input.locale,
    recentQueries: input.recentQueries.slice(0, 10),
    recentClicks: input.recentClicks.slice(0, 10),
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
        max_tokens: 1500,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        result: { recommendations: [], source: 'fallback' },
        trace: {
          rawTextLength: 0,
          rawTextFirst300: body.slice(0, 300),
          parseFailed: true,
          parseFailReason: `http ${res.status}`,
        },
      };
    }
    const data = (await res.json()) as ClaudeResponse;
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
    const parsed = parsePersonal(text);
    if (parsed === null) {
      return {
        result: { recommendations: [], source: 'fallback' },
        trace: {
          rawTextLength: text.length,
          rawTextFirst300: text.slice(0, 300),
          parseFailed: true,
          parseFailReason: 'parsePersonal returned null',
        },
      };
    }
    return {
      result: { recommendations: parsed, source: 'anthropic' },
      trace: {
        rawTextLength: text.length,
        rawTextFirst300: text.slice(0, 300),
        parseFailed: false,
        parsedCount: parsed.length,
      },
    };
  } catch (e) {
    return {
      result: { recommendations: [], source: 'fallback' },
      trace: {
        rawTextLength: 0,
        rawTextFirst300: e instanceof Error ? e.message : String(e),
        parseFailed: true,
        parseFailReason: 'threw',
      },
    };
  }
}

function parsePersonal(text: string): PersonalRecommendation[] | null {
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
  const list = (raw as { recommendations?: unknown }).recommendations;
  if (!Array.isArray(list)) return null;
  const validCategories: RecommendationCategory[] = [
    'electronics',
    'fashion',
    'beauty',
    'home',
    'kitchen',
    'sports',
    'pet',
    'baby',
    'jewelry',
    'food',
    'other',
  ];
  // Strip any stray emoji the model might leak despite the no-emoji rule.
  // Range covers emoji blocks + variation selectors + ZWJ combiners.
  const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
  const cleaned: PersonalRecommendation[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const it = item as Partial<PersonalRecommendation> & { emoji?: string };
    if (typeof it.name !== 'string' || it.name.trim().length < 3) continue;
    if (typeof it.reason !== 'string' || it.reason.trim().length < 3) continue;
    const category = validCategories.includes(it.category as RecommendationCategory)
      ? (it.category as RecommendationCategory)
      : 'other';
    cleaned.push({
      name: it.name.trim().replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim().slice(0, 120),
      reason: it.reason.trim().replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim().slice(0, 200),
      category,
    });
    if (cleaned.length >= 4) break;
  }
  return cleaned;
}
