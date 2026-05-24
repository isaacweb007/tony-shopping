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

export async function extractFromImage(dataUrl: string): Promise<VisionExtract> {
  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) {
    return {
      suggestedQuery: '',
      tags: ['image-upload'],
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
