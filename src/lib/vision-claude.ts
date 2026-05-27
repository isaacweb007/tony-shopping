/**
 * Claude vision — semantic product identification from a video thumbnail.
 *
 * Why Claude on top of Google Vision: Vision API returns generic labels
 * ("shoe", "fashion accessory", "leather"). For a shopping search we want
 * a phrase a human would actually type. Claude with vision returns
 * "white Nike Air Force 1 low-top sneakers" — directly searchable.
 *
 * Used by /api/extract as the preferred semantic layer when ANTHROPIC_API_KEY
 * is configured. Falls through silently on any error so the caller can fall
 * back to Google Vision and then to the oEmbed/OG title.
 */
import 'server-only';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';

const PROMPT = `이 이미지는 SNS 영상(틱톡/인스타/유튜브)의 썸네일이야. 사용자가 영상 속에 등장하는 상품을 사고 싶어해서 찾는 중이야.

이 이미지에서 가장 명확히 보이는 상품(또는 가장 핵심 상품) 하나를 골라서, 그 상품을 쇼핑 사이트에서 찾기 위한 검색어를 5~10단어로 작성해줘.

규칙:
- 답변은 검색어 단 한 줄만. 설명·따옴표·접두어("검색어:" 등) 절대 금지.
- 브랜드명을 알면 포함. 모르면 색상 + 카테고리 + 특징 형태.
- 사람·풍경·배경은 무시하고 상품 자체만.
- 상품이 보이지 않거나 분간이 안 되면 빈 줄 한 줄만 반환.

예시 좋은 답변:
- "white Nike Air Force 1 low-top sneakers"
- "검정 미니 가죽 백팩 여성용"
- "Apple AirPods Pro 2 white wireless earbuds"

예시 나쁜 답변 (절대 이렇게 답하지 마):
- "이 사진에는 신발이 보입니다..." (설명 금지)
- "상품: Nike Air Force 1" (접두어 금지)
- "Nike" (너무 짧음, 카테고리 필수)`;

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
}

/**
 * Identify the product visible in an image and return a shopping query.
 * Returns null on missing key, network error, or empty/refusal response —
 * callers should fall back to other vision providers.
 */
export async function identifyProductWithClaude(
  dataUrl: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  // Parse data URL: "data:image/jpeg;base64,..."
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;
  const mediaType = m[1]!;
  const base64 = m[2]!;

  // Claude vision supports png, jpeg, gif, webp.
  if (!/^image\/(png|jpeg|gif|webp)$/.test(mediaType)) {
    return null;
  }

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
        max_tokens: 60,
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
    // Cap length defensively.
    const trimmed = text.replace(/^["']|["']$/g, '').slice(0, 120).trim();
    return trimmed.length >= 3 ? trimmed : null;
  } catch (e) {
    console.error('[Claude vision] threw', e instanceof Error ? e.message : e);
    return null;
  }
}
