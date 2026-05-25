/**
 * Compare-page LLM narrative.
 *
 * Given a small cohort of shortlisted products + the user's stated priority
 * + the rule-based winner, produces a 2–3 sentence verdict that contextualises
 * the pick. Same provider order as lib/llm.ts (Anthropic → OpenAI → fallback).
 */
import 'server-only';

export type NarrativeLocale = 'ko' | 'en' | 'vi';
export type NarrativePriority = 'balanced' | 'value' | 'fast' | 'genuine';

export interface NarrativeCandidate {
  id: string;
  name: string;
  store: string;
  /** Already-converted-to-USD numeric for cross-cohort comparison. */
  priceUsd: number | null;
  /** Localised price string for narrative text (model echoes the user's currency). */
  priceLabel: string;
  shipDays: number | null;
  rating: number | null;
  reviewCount: number | null;
  authenticityPct: number | null;
  official: boolean;
  tonyScore: number | null;
  isWinner: boolean;
}

export interface NarrativeInput {
  locale: NarrativeLocale;
  priority: NarrativePriority;
  reasonKeys: string[];
  candidates: NarrativeCandidate[];
}

export interface NarrativeResult {
  /** 2–3 sentences in the user's locale. Plain text, no markdown. */
  narrative: string;
  source: 'anthropic' | 'openai' | 'fallback';
}

const SYSTEM_PROMPT = `You are Tony, an AI meta-shopping concierge. The user already has 2–5 shortlisted listings and just asked: "out of these, which one and why?". The cohort scoring engine already picked a winner using the user's stated priority. Your job is to write a calm, decisive 2–3 sentence verdict in the user's locale that (1) names the winning listing, (2) cites at most two concrete reasons grounded ONLY in the data we give you (price, ship days, rating/review count, authenticity %, official flag), and (3) optionally acknowledges the runner-up in one short clause if relevant.

Rules:
- Never invent numbers or features not present in the data.
- Don't use the words "AI", "algorithm", or "score".
- No emoji. No markdown. No bullet points. No headings.
- Treat the priority preset as the user's framing: value = cheapest decent, fast = fastest arrival, genuine = safest authenticity, balanced = best overall.
- Return ONLY the narrative text (no JSON wrapper, no quotes).`;

function priorityLabel(p: NarrativePriority): string {
  switch (p) {
    case 'value':
      return 'best value (price-leaning)';
    case 'fast':
      return 'fastest shipping';
    case 'genuine':
      return 'lowest counterfeit risk';
    default:
      return 'best overall';
  }
}

function buildUserPrompt(input: NarrativeInput): string {
  const lines: string[] = [
    `User locale: ${input.locale}`,
    `User priority: ${input.priority} (${priorityLabel(input.priority)})`,
    `Engine reasons for the pick: ${input.reasonKeys.join(', ') || '(none — too close to call)'}`,
    '',
    'Cohort (the winner is flagged WIN):',
  ];
  for (const c of input.candidates) {
    const flags: string[] = [];
    flags.push(c.store);
    if (c.official) flags.push('official');
    if (c.isWinner) flags.push('WIN');
    const meta: string[] = [];
    meta.push(`price=${c.priceLabel}`);
    if (c.shipDays != null) meta.push(`ship=${c.shipDays}d`);
    if (c.rating != null && c.reviewCount != null)
      meta.push(`rating=${c.rating}/${c.reviewCount}`);
    if (c.authenticityPct != null) meta.push(`authenticity=${c.authenticityPct}%`);
    if (c.tonyScore != null) meta.push(`tony=${c.tonyScore}`);
    lines.push(`- [${flags.join('/')}] ${c.name} (${meta.join(', ')})`);
  }
  return lines.join('\n');
}

async function callAnthropic(input: NarrativeInput, key: string): Promise<NarrativeResult | null> {
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
        max_tokens: 240,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(input) }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? []).find((c) => c.type === 'text')?.text;
    if (!text) return null;
    return { narrative: cleanup(text), source: 'anthropic' };
  } catch {
    return null;
  }
}

async function callOpenAI(input: NarrativeInput, key: string): Promise<NarrativeResult | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 240,
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
    if (!text) return null;
    return { narrative: cleanup(text), source: 'openai' };
  } catch {
    return null;
  }
}

function cleanup(raw: string): string {
  return raw
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 600);
}

/** Deterministic fallback so the UI always renders something useful. */
function fallback(input: NarrativeInput): NarrativeResult {
  const winner = input.candidates.find((c) => c.isWinner);
  const rest = input.candidates.filter((c) => !c.isWinner);
  const runnerUp = rest[0];
  const TEMPLATES: Record<NarrativeLocale, (w: NarrativeCandidate | undefined, r: NarrativeCandidate | undefined, priority: NarrativePriority) => string> = {
    ko: (w, r, p) => {
      if (!w) return '후보들이 비슷해서 한 곳을 고르기 어려워요. 우선순위를 다시 골라보면 결과가 달라질 수 있어요.';
      const lead = p === 'value'
        ? `가성비를 우선했을 때, ${w.store}의 "${w.name}" 가 ${w.priceLabel}로 가장 합리적이에요.`
        : p === 'fast'
          ? `빠른 배송을 우선했을 때, ${w.store}의 "${w.name}" 가 ${w.shipDays ?? '?'}일 안에 도착해 가장 빨라요.`
          : p === 'genuine'
            ? `정품 안전을 우선했을 때, ${w.store}의 "${w.name}" 가 ${w.authenticityPct ?? '?'}% 정품 가능성으로 가장 안전해요.`
            : `종합적으로 ${w.store}의 "${w.name}" 가 가격·배송·신뢰도 균형이 가장 좋아요.`;
      const tail = r ? ` 차순위는 ${r.store}예요 — 우선순위를 바꾸면 이쪽이 올라올 수 있어요.` : '';
      return lead + tail;
    },
    en: (w, r, p) => {
      if (!w) return "These candidates are too close to call. Pick a priority to break the tie.";
      const lead = p === 'value'
        ? `For best value, ${w.store}'s "${w.name}" at ${w.priceLabel} is the strongest pick in your shortlist.`
        : p === 'fast'
          ? `For speed, ${w.store}'s "${w.name}" arrives in ~${w.shipDays ?? '?'} days, the fastest in your shortlist.`
          : p === 'genuine'
            ? `For authenticity, ${w.store}'s "${w.name}" sits at ${w.authenticityPct ?? '?'}% trusted-source confidence, the safest in your shortlist.`
            : `On balance, ${w.store}'s "${w.name}" offers the best combination of price, shipping, and trust.`;
      const tail = r ? ` Runner-up: ${r.store} — change the priority and it can leapfrog.` : '';
      return lead + tail;
    },
    vi: (w, r, p) => {
      if (!w) return 'Các ứng viên quá cân bằng. Chọn một ưu tiên để phân định.';
      const lead = p === 'value'
        ? `Về tính kinh tế, "${w.name}" tại ${w.store} với ${w.priceLabel} là lựa chọn mạnh nhất.`
        : p === 'fast'
          ? `Về tốc độ, "${w.name}" tại ${w.store} đến trong ~${w.shipDays ?? '?'} ngày, nhanh nhất nhóm.`
          : p === 'genuine'
            ? `Về độ tin cậy, "${w.name}" tại ${w.store} đạt ${w.authenticityPct ?? '?'}% niềm tin chính hãng, an toàn nhất.`
            : `Tổng thể, "${w.name}" tại ${w.store} cân bằng giá, giao hàng và uy tín tốt nhất.`;
      const tail = r ? ` Á quân: ${r.store} — đổi ưu tiên có thể đảo vị trí.` : '';
      return lead + tail;
    },
  };
  return {
    narrative: TEMPLATES[input.locale](winner, runnerUp, input.priority),
    source: 'fallback',
  };
}

export async function compareNarrative(input: NarrativeInput): Promise<NarrativeResult> {
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  if (anthropic) {
    const r = await callAnthropic(input, anthropic);
    if (r && r.narrative.length > 0) return r;
  }
  if (openai) {
    const r = await callOpenAI(input, openai);
    if (r && r.narrative.length > 0) return r;
  }
  return fallback(input);
}
