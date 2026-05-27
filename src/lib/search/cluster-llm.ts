/**
 * LLM-powered product grouping.
 *
 * Why on top of Jaccard: token-set similarity catches "AirPods Pro 2" vs
 * "Apple Airpods Pro 2" but misses "Apple AirPods Pro 2" vs "에어팟 프로
 * 2세대 맥세이프" (cross-language + reordered) and "Sony WH-1000XM5"
 * vs "소니 노이즈캔슬링 헤드폰 WH-1000XM5 플래티넘" (same product,
 * different descriptive packaging). Claude reads the titles holistically
 * and groups them the way a human would.
 *
 * Strict latency budget: ~4 s timeout. If Claude is slow or unreachable
 * we silently fall back to the Jaccard clusterer so search never blocks
 * indefinitely.
 *
 * Cost shape: 1 Claude call per /api/search. Tokens scale with the
 * number of product titles (typically 12–20), so ~600 input + 200 output
 * tokens = sub-cent per search. Edge cache on /api/search amortises
 * repeated queries down further.
 */
import 'server-only';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';
const TIMEOUT_MS = 5000;

const SYSTEM_PROMPT = `You are a product-grouping classifier for a meta-shopping search agent.

Input: a numbered list of product titles, each from a different merchant in a search result set.
Output: JSON listing which titles refer to the SAME physical product (could be sold by multiple merchants at different prices).

Rules (strict):
- Different generations are DIFFERENT products. "Sony WH-1000XM5" ≠ "Sony WH-1000XM4".
- Accessories are DIFFERENT from the main product. "AirPods Pro 2 이어팁" ≠ "AirPods Pro 2". "갤럭시 S24 케이스" ≠ "갤럭시 S24".
- Color or storage variants of the same model are the SAME product. Black AirPods Pro 2 = White AirPods Pro 2. iPhone 15 128GB = iPhone 15 256GB.
- Cross-language same-product IS the same. "Sony WH-1000XM5" = "소니 WH-1000XM5".
- Bundles or sets are DIFFERENT from the bare product. "Dyson V15 + 추가 헤드" ≠ "Dyson V15".
- Different sizes (S/M/L) of clothing are the SAME product. "Nike Air Max 270 280mm" = "Nike Air Max 270 270mm".
- If genuinely unsure, keep separate.

Every index must appear in EXACTLY ONE group. Singleton groups are fine.

Output ONLY JSON in this exact shape:
{"groups": [[0,3,7], [1], [2,4], ...]}`;

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
}

/**
 * Ask Claude to group product titles by physical-product identity.
 * Returns an array of index groups (each group = same product across
 * merchants) or null on any failure so the caller can fall back.
 */
export async function clusterIndicesWithClaude(
  titles: string[],
  signal?: AbortSignal,
): Promise<number[][] | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || titles.length <= 1) return null;

  const numbered = titles.map((t, i) => `${i}: ${t.slice(0, 200)}`).join('\n');

  // Combine the caller's signal with our timeout so either can abort us.
  const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
  const composed = signal
    ? (typeof AbortSignal.any === 'function'
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal)
    : timeoutSignal;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: composed,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        // Deterministic — same titles always produce same grouping, which
        // lets the edge cache do its job and makes debugging tractable.
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: numbered }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Cluster LLM] non-ok', res.status, body.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as ClaudeResponse;
    if (data.error) {
      console.error('[Cluster LLM] api error', data.error);
      return null;
    }
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
    return parseGroups(text, titles.length);
  } catch (e) {
    // Includes both timeout and network errors. Caller falls back to
    // Jaccard so the search response still ships.
    console.error('[Cluster LLM] threw', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Parse Claude's `{"groups": [[...], [...]]}` output tolerantly.
 * - Strips markdown fences if Claude wraps the JSON despite the prompt.
 * - Validates every index is in range and appears at most once.
 * - Adds singleton groups for any indices Claude forgot.
 */
function parseGroups(text: string, totalCount: number): number[][] | null {
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const groups = (parsed as { groups?: unknown }).groups;
  if (!Array.isArray(groups)) return null;

  const seen = new Set<number>();
  const cleaned: number[][] = [];
  for (const g of groups) {
    if (!Array.isArray(g)) continue;
    const valid: number[] = [];
    for (const idx of g) {
      if (
        typeof idx !== 'number' ||
        !Number.isInteger(idx) ||
        idx < 0 ||
        idx >= totalCount ||
        seen.has(idx)
      ) {
        continue;
      }
      seen.add(idx);
      valid.push(idx);
    }
    if (valid.length > 0) cleaned.push(valid);
  }

  // Any index Claude missed → singleton, so no product gets dropped.
  for (let i = 0; i < totalCount; i++) {
    if (!seen.has(i)) cleaned.push([i]);
  }

  return cleaned;
}
