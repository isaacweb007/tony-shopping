/**
 * Claude vision — semantic product identification from an image.
 *
 * Single API call returns up to 3 ranked candidate shopping queries so the
 * user can disambiguate when the image has multiple plausible products
 * (e.g. an outfit shot with shoes + bag + jacket). The first candidate is
 * always the "most confident" pick.
 *
 * Falls through silently on any error so the caller can fall back to
 * Google Vision and then to the oEmbed/OG title.
 */
import 'server-only';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';

const PROMPT = `이 이미지는 SNS 영상(틱톡/인스타/유튜브)의 썸네일이야.
사용자가 영상 속에 등장하는 상품을 사고 싶어해서 찾는 중이야.

이 이미지에서 보이는 상품 후보를 최대 3개 골라서 JSON으로만 답해줘. 가장 확실한 후보가 첫 번째여야 해.

규칙:
- JSON 외 텍스트 절대 금지. 설명·따옴표·접두어 ("후보:" 등) 금지.
- 각 항목은 5~10단어 한국어 검색어. 브랜드 알면 포함, 모르면 색상 + 카테고리 + 특징.
- 사람·풍경·배경은 무시. 상품 자체만.
- 후보가 1개면 1개만 반환해도 됨. 보이는 상품이 없거나 분간 안 되면 빈 배열.

응답 형식 (반드시 이 JSON 형태):
{"candidates": ["후보1", "후보2", "후보3"]}

좋은 예시:
{"candidates": ["white Nike Air Force 1 sneakers", "white low-top tennis shoes"]}
{"candidates": ["청록색 스노클링 마스크 세트", "물안경 다이빙 마스크"]}
{"candidates": ["Apple AirPods Pro 2 white wireless earbuds"]}
{"candidates": []}

나쁜 예시 (절대 이렇게 답하지 마):
"이 사진에는..." (설명 금지)
{"main": "..."} (필드명 candidates 아님)
\`\`\`json ...\`\`\` (코드블록 금지)`;

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
}

export interface ClaudeVisionResult {
  /** Highest-confidence candidate. Always non-empty when this object is returned. */
  main: string;
  /** Additional candidates (0-2 items). May be empty. */
  alternatives: string[];
}

/**
 * Identify product(s) visible in an image and return ranked shopping queries.
 * Returns null on: missing key, network error, JSON parse failure, or
 * empty/refusal response. Callers should fall back to Google Vision.
 */
export async function identifyProductWithClaude(
  dataUrl: string,
  signal?: AbortSignal,
): Promise<ClaudeVisionResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  // Parse data URL: "data:image/jpeg;base64,..."
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;
  const mediaType = m[1]!;
  const base64 = m[2]!;
  if (!/^image\/(png|jpeg|gif|webp)$/.test(mediaType)) return null;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Claude vision] non-ok', res.status, body.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as ClaudeResponse;
    if (data.error) {
      console.error('[Claude vision] api error', data.error);
      return null;
    }
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
    if (!text) return null;
    return parseClaudeJson(text);
  } catch (e) {
    console.error('[Claude vision] threw', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Tolerant JSON parser for Claude's response. The model is instructed to
 * return raw JSON but occasionally wraps in markdown fences or adds prose,
 * so try a couple of extraction passes before giving up.
 */
function parseClaudeJson(text: string): ClaudeVisionResult | null {
  // Strip markdown fences if present.
  let body = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  // Find the first {...} block if there's prose around it.
  if (!body.startsWith('{')) {
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) body = body.slice(start, end + 1);
    else return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const cands = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(cands)) return null;
  const clean = cands
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.replace(/^["']|["']$/g, '').slice(0, 120).trim())
    .filter((s) => s.length >= 3);
  if (clean.length === 0) return null;
  return { main: clean[0]!, alternatives: clean.slice(1, 3) };
}
