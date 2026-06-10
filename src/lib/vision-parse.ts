/**
 * Pure parser for Claude's structured product-identification JSON. Extracted
 * from vision-claude.ts (which is `server-only`) so it can be unit-tested in a
 * plain Node/vitest context. No IO, no server deps.
 */

export interface ClaudeVisionResult {
  /** Best single query — strict (brand+model) when confident, else loose. */
  main: string;
  /** 0-3 additional candidate queries, including the loose/broad fallback. */
  alternatives: string[];
  /** Identified brand, when recognizable. */
  brand?: string;
  /** Identified model / product name. */
  model?: string;
  /** Category label (e.g. "무선 이어폰"). */
  category?: string;
  /** Strict brand+model query for exact matching. */
  queryStrict?: string;
  /** Broad category-level query for fallback breadth. */
  queryLoose?: string;
}

function cleanStr(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

/**
 * Runaway guard only: the prompt already asks for short queries, but cap at
 * `max` tokens so a verbose response can't poison the keyword search. Unlike
 * the old 4-token cut this keeps brand+model+variant intact for any realistic
 * query.
 */
export function clampWords(s: string, max = 8): string {
  const tokens = s.split(/\s+/).filter(Boolean);
  return tokens.length <= max ? s : tokens.slice(0, max).join(' ');
}

/**
 * Parse Claude's response into a structured identity. Tolerant of markdown
 * fences / surrounding prose. Returns null when there's no usable product.
 */
export function parseProductIdentity(text: string): ClaudeVisionResult | null {
  let body = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
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
  const obj = parsed as Record<string, unknown>;

  const brand = cleanStr(obj.brand);
  const model = cleanStr(obj.model);
  const category = cleanStr(obj.category);
  const strict = clampWords(cleanStr(obj.queryStrict));
  const loose = clampWords(cleanStr(obj.queryLoose));
  const altRaw = Array.isArray(obj.alternatives) ? obj.alternatives : [];
  const alts = altRaw.map((s) => clampWords(cleanStr(s))).filter((s) => s.length >= 2);

  // Headline = strict when present, else loose, else first alternative.
  const main = strict || loose || alts[0] || '';
  if (main.length < 2) return null;

  // Alternatives = loose + category + provided alts, deduped, minus the main.
  const seen = new Set<string>([main]);
  const alternatives: string[] = [];
  for (const cand of [loose, category, ...alts]) {
    const c = cand.trim();
    if (c.length >= 2 && !seen.has(c)) {
      seen.add(c);
      alternatives.push(c);
    }
  }

  return {
    main,
    alternatives: alternatives.slice(0, 3),
    brand: brand || undefined,
    model: model || undefined,
    category: category || undefined,
    queryStrict: strict || undefined,
    queryLoose: loose || undefined,
  };
}
