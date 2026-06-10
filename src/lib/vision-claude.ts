/**
 * Claude vision — semantic product identification from an image (or several
 * video frames).
 *
 * Returns a STRUCTURED identity (brand / model / category) plus two queries:
 *   - queryStrict: brand + model, for an exact-match search ("Apple AirPods Pro 2")
 *   - queryLoose:  category-level, for fallback breadth ("무선 이어폰 노이즈캔슬링")
 * The strict query is the headline; the loose query rides along as a candidate
 * so the user (or the search layer) can widen the net when strict returns
 * nothing. This replaces the old "keep the first 4 tokens" truncation, which
 * silently dropped model numbers.
 *
 * An optional caption (the SNS post's title/description) is passed as text
 * context so the model can recover a brand/model the pixels alone are
 * ambiguous about — while being told to ignore "link in bio" style noise.
 *
 * Falls through to null on any error so the caller can fall back to Google
 * Vision and then to the oEmbed/OG title.
 */
import 'server-only';
import { parseProductIdentity, type ClaudeVisionResult } from './vision-parse';

export type { ClaudeVisionResult } from './vision-parse';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';

const PROMPT = `이 이미지는 SNS(틱톡/인스타/유튜브/페북) 게시물의 썸네일 또는 영상 프레임이야.
사용자는 이 콘텐츠에 나온 "상품"을 쇼핑몰에서 사고 싶어해.

이미지(와 캡션이 있다면 캡션)를 보고 가장 핵심 상품 하나를 식별해서 아래 JSON 형식으로만 답해.

식별 규칙:
- 브랜드와 모델/세대를 알아낼 수 있으면 정확히. 모델 번호·세대·핵심 변형(예: "USB-C", "Pro 2", "WH-1000XM5")은 검색에 매우 중요하니 빠뜨리지 마.
- queryStrict = 브랜드 + 모델(+핵심 변형). 사람이 쇼핑몰에서 그 제품을 정확히 찾을 때 칠 검색어. 보통 2~5단어. 예: "Apple AirPods Pro 2 USB-C", "Sony WH-1000XM5".
- queryLoose = 브랜드 없이도 매칭되는 카테고리 수준의 넓은 검색어. 예: "무선 이어폰 노이즈캔슬링", "스노클링 마스크 세트".
- 브랜드를 모르면 brand/model은 null로 두고, queryStrict에는 보이는 가장 구체적인 제품 설명(색상·형태·소재 포함)을 넣어.
- 사람·풍경·배경·로고 워터마크는 무시. 상품 자체만.
- 상품이 안 보이거나 분간이 안 되면 모든 값을 null / 빈 배열로.

출력은 JSON만. 코드블록·설명·접두어 금지.
형식:
{"brand": string|null, "model": string|null, "category": string|null, "queryStrict": string|null, "queryLoose": string|null, "alternatives": [string, ...]}

좋은 예시:
{"brand":"Apple","model":"AirPods Pro 2","category":"무선 이어폰","queryStrict":"Apple AirPods Pro 2 USB-C","queryLoose":"무선 이어폰 노이즈캔슬링","alternatives":["에어팟 프로 2","노이즈캔슬링 이어폰"]}
{"brand":null,"model":null,"category":"스노클링 마스크","queryStrict":"청록색 풀페이스 스노클링 마스크","queryLoose":"스노클링 마스크 세트","alternatives":["다이빙 마스크","수경 세트"]}
{"brand":null,"model":null,"category":null,"queryStrict":null,"queryLoose":null,"alternatives":[]}`;

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
}

export interface IdentifyOpts {
  /** SNS post title/description, used as grounding text context. */
  caption?: string;
  signal?: AbortSignal;
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

/** Trim a caption to a sane size and strip obvious "link in bio" noise. */
function sanitizeCaption(caption: string): string {
  return caption
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#@]\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

/**
 * Identify product(s) visible in one OR MORE images and return a structured
 * identity + ranked shopping queries. Accepts a single data URL or an array —
 * when given multiple (video frames sampled across the timeline) Claude sees
 * the product even if the cover frame is a talking-head intro.
 *
 * Returns null on: missing key, no decodable images, network error, JSON parse
 * failure, or empty/refusal response. Callers fall back to Google Vision.
 */
export async function identifyProductWithClaude(
  dataUrl: string | string[],
  opts: IdentifyOpts = {},
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

  let promptText = PROMPT;
  if (blocks.length > 1) {
    promptText += `\n\n참고: 위 이미지들은 같은 영상의 서로 다른 장면(프레임)들이야. 영상 전체에서 가장 핵심적으로 등장하는 상품 하나를 중심으로 식별해.`;
  }
  const caption = opts.caption ? sanitizeCaption(opts.caption) : '';
  if (caption) {
    promptText += `\n\n참고 캡션/제목: "${caption}"\n캡션에 브랜드·모델·제품명이 있으면 식별에 적극 반영해. 단 의미 없는 홍보 문구나 일반적인 감성 문구는 무시하고 이미지를 우선해.`;
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: opts.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 320,
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
    return parseProductIdentity(text);
  } catch (e) {
    console.error('[Claude vision] threw', e instanceof Error ? e.message : e);
    return null;
  }
}
