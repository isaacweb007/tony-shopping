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
사용자가 영상 속에 등장하는 상품을 사고 싶어해서 쇼핑 사이트에서 찾는 중이야.

이 이미지에서 보이는 상품 후보를 최대 3개 골라서 JSON으로만 답해줘. 가장 확실한 후보가 첫 번째여야 해.

⚠️ 가장 중요한 규칙 — 검색어 길이 제한:
- 각 항목은 **3~5단어**의 간결한 한국어 검색어로만 작성. 절대 6단어 넘기지 마.
- 너무 구체적으로 묘사하면 쇼핑 사이트가 매칭을 못 함. "청록색 트로피컬 패턴 스노클링 마스크 물안경 세트" (X) — 너무 김 → "스노클링 마스크 세트" (O).
- 브랜드명을 알면 반드시 포함 + 카테고리. "Apple AirPods Pro 2" (O), "흰색 무선 이어폰" (브랜드 모를 때만 O).
- 색상은 브랜드 모를 때만. 브랜드를 안다면 "Sony WH-1000XM5"만으로 충분 (색상 빼).
- 사람·풍경·배경은 무시. 상품 자체만.

기타 규칙:
- JSON 외 텍스트 절대 금지. 설명·따옴표·접두어 ("후보:" 등) 금지.
- 후보 3개는 서로 달라야 함 (다른 카테고리 또는 다른 추상 레벨).
- 보이는 상품이 없거나 분간 안 되면 빈 배열.

응답 형식 (반드시 이 JSON 형태):
{"candidates": ["후보1", "후보2", "후보3"]}

좋은 예시:
{"candidates": ["Nike Air Force 1", "흰색 운동화", "스니커즈"]}
{"candidates": ["스노클링 마스크", "다이빙 핀", "수영 장비 세트"]}
{"candidates": ["Apple AirPods Pro 2", "무선 이어폰", "노이즈캔슬링 이어폰"]}
{"candidates": []}

나쁜 예시 (절대 이렇게 답하지 마):
{"candidates": ["청록색 트로피컬 패턴 스노클링 마스크 물안경 세트"]} (너무 김 — 7단어 넘음)
{"candidates": ["white Nike Air Force 1 low-top sneakers with classic design"]} (영어 너무 김)
"이 사진에는..." (설명 금지)
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

interface ImageBlock {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
}

/** Parse a data URL into a Claude image block, or null if unusable. */
function toImageBlock(dataUrl: string): ImageBlock | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;
  const mediaType = m[1]!;
  const base64 = m[2]!;
  if (!/^image\/(png|jpeg|gif|webp)$/.test(mediaType)) return null;
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
}

/**
 * Identify product(s) visible in one OR MORE images and return ranked
 * shopping queries. Accepts a single data URL or an array of them — when
 * given multiple (e.g. video frames sampled across the timeline) Claude
 * sees the product even if the cover frame is a talking-head intro.
 *
 * Returns null on: missing key, no decodable images, network error, JSON
 * parse failure, or empty/refusal response. Callers fall back to Google
 * Vision.
 */
export async function identifyProductWithClaude(
  dataUrl: string | string[],
  signal?: AbortSignal,
): Promise<ClaudeVisionResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const urls = Array.isArray(dataUrl) ? dataUrl : [dataUrl];
  // Cap at 4 frames — enough timeline coverage without ballooning tokens.
  const blocks = urls
    .map(toImageBlock)
    .filter((b): b is ImageBlock => b !== null)
    .slice(0, 4);
  if (blocks.length === 0) return null;

  // When we have multiple frames, tell Claude they're from one video so it
  // reasons across them rather than treating each as a separate product.
  const promptText =
    blocks.length > 1
      ? `${PROMPT}\n\n참고: 위 이미지들은 같은 영상의 서로 다른 장면(프레임)들이야. 영상 전체에서 가장 핵심적으로 등장하는 상품 하나를 중심으로 후보를 골라줘.`
      : PROMPT;

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
            content: [...blocks, { type: 'text', text: promptText }],
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
    .map(condenseQuery)
    .filter((s) => s.length >= 3);
  if (clean.length === 0) return null;
  return { main: clean[0]!, alternatives: clean.slice(1, 3) };
}

/**
 * Safety net: if Claude returns a query longer than ~6 tokens despite the
 * prompt's length cap, condense it down. SerpAPI's Google Shopping engine
 * does fuzzy matching on short queries but falls through to unrelated
 * results when every adjective has to match — "청록색 트로피컬 패턴
 * 스노클링 마스크 물안경 세트" (7 tokens) returns shoes and foam cleanser
 * for "쿨" / "패턴". 4-token caps keep the brand+category signal without
 * the overspecific adjective noise.
 *
 * Strategy:
 *  - Tokens already ≤ 5 → leave as-is.
 *  - Longer → keep the FIRST 4 tokens (heads usually carry brand/category;
 *    adjective tails carry color/material/etc. which we drop).
 *
 * Word boundaries: any whitespace splits.
 */
function condenseQuery(s: string): string {
  const tokens = s.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length <= 5) return s;
  return tokens.slice(0, 4).join(' ');
}
