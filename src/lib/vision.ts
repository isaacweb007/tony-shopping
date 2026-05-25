/**
 * Google Cloud Vision API client.
 *
 * Use POST https://vision.googleapis.com/v1/images:annotate?key=API_KEY
 *
 * We request three feature kinds:
 *   - LABEL_DETECTION       — generic concept labels ("shoe", "bag")
 *   - WEB_DETECTION         — entities/best-guess labels (often a real product term)
 *   - LOCALIZED_OBJECT_*    — bounding-boxed object names
 *
 * We then merge into a ranked list of candidate search terms.
 */
import 'server-only';

const ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

interface VisionResponse {
  responses?: Array<{
    labelAnnotations?: Array<{ description?: string; score?: number }>;
    webDetection?: {
      bestGuessLabels?: Array<{ label?: string }>;
      webEntities?: Array<{ description?: string; score?: number }>;
    };
    localizedObjectAnnotations?: Array<{ name?: string; score?: number }>;
    error?: { code?: number; message?: string };
  }>;
}

export interface VisionExtract {
  /** Suggested free-form query — what Tony would type into search. */
  suggestedQuery: string;
  /** All candidate terms, ranked. */
  tags: string[];
  /** Whether the call hit a real Vision API (vs heuristic fallback). */
  source: 'vision' | 'fallback';
}

/**
 * Filename-only heuristic — when Vision isn't configured, the next-best
 * signal we have is the original filename. Most camera/screenshot defaults
 * are useless (IMG_0123.jpg, Screenshot 2024-08-12 14.31.20.png), but
 * downloaded product images often retain merchant slugs that are quite
 * descriptive ("airpods-pro-2-usbc-overview.png"). We strip the noise and
 * keep the rest.
 *
 * Returns a cleaned candidate string ('' when nothing useful survives).
 */
export function heuristicFromFilename(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  // Drop common camera/screenshot prefixes wholesale.
  const NOISE_PATTERNS = [
    /^IMG[\s_-]?\d+/i,
    /^DSC[\s_-]?\d+/i,
    /^PXL[\s_-]?\d+/i,
    /^DCIM[\s_-]?\d+/i,
    /^image[\s_-]?\d+/i,
    /^photo[\s_-]?\d+/i,
    // Screenshot in EN/KR — tolerate whitespace + accent characters between
    // the label and the timestamp.
    /^Screenshot[\s_-]+[\d\s\-_.오전후AMPamp]+/i,
    /^스크린샷[\s_-]+[\d\s\-_.오전후AMPamp]+/i,
    /^KakaoTalk[\s_-]?[\d_\-.]*/i,
  ];
  let cleaned = stem;
  for (const p of NOISE_PATTERNS) {
    cleaned = cleaned.replace(p, '');
  }
  cleaned = cleaned
    .replace(/[_\-]+/g, ' ')          // separators → spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → spaced
    .replace(/\b\d{6,}\b/g, '')       // long digit runs (timestamps)
    .replace(/\s+/g, ' ')
    .trim();
  // Strip leading/trailing digit-only tokens.
  cleaned = cleaned.replace(/^\d+\s+|\s+\d+$/g, '').trim();
  if (cleaned.length < 3) return '';
  // Sentence case the result.
  return cleaned.slice(0, 80);
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const k = s.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s.trim());
  }
  return out;
}

export async function extractFromImage(
  dataUrl: string,
  filename?: string,
): Promise<VisionExtract> {
  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) {
    const fromName = filename ? heuristicFromFilename(filename) : '';
    return {
      suggestedQuery: fromName,
      tags: fromName ? ['from-filename'] : ['image-upload'],
      source: 'fallback',
    };
  }

  // Strip the `data:image/...;base64,` prefix.
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return { suggestedQuery: '', tags: [], source: 'fallback' };
  }
  const base64 = dataUrl.slice(commaIdx + 1);

  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'WEB_DETECTION', maxResults: 10 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        ],
      },
    ],
  };

  let json: VisionResponse;
  try {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Vision responses are large; don't cache.
      cache: 'no-store',
    });
    if (!res.ok) {
      return { suggestedQuery: '', tags: [`vision_http_${res.status}`], source: 'fallback' };
    }
    json = (await res.json()) as VisionResponse;
  } catch {
    return { suggestedQuery: '', tags: ['vision_network_error'], source: 'fallback' };
  }

  const r = json.responses?.[0];
  if (!r || r.error) {
    return { suggestedQuery: '', tags: ['vision_error'], source: 'fallback' };
  }

  const bestGuess = r.webDetection?.bestGuessLabels?.[0]?.label?.trim();
  const webEntities = (r.webDetection?.webEntities ?? [])
    .filter((e) => (e.score ?? 0) > 0.5)
    .map((e) => e.description ?? '');
  const objects = (r.localizedObjectAnnotations ?? [])
    .filter((o) => (o.score ?? 0) > 0.6)
    .map((o) => o.name ?? '');
  const labels = (r.labelAnnotations ?? [])
    .filter((l) => (l.score ?? 0) > 0.7)
    .map((l) => l.description ?? '');

  const ranked = dedupe([
    ...(bestGuess ? [bestGuess] : []),
    ...webEntities,
    ...objects,
    ...labels,
  ]);

  return {
    suggestedQuery: bestGuess || ranked[0] || '',
    tags: ranked.slice(0, 12),
    source: 'vision',
  };
}
