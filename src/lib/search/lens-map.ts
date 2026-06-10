/**
 * Pure mapper for SerpAPI Google Lens "visual_matches" → a clean match shape.
 * Extracted from the server-only fetch wrapper so it can be unit-tested.
 *
 * Google Lens reverse-image search is the path closest to the app's intent:
 * given the product's photo (an SNS thumbnail), it returns the actual pages /
 * stores selling that exact item — no keyword guessing in between.
 */

export interface LensMatch {
  /** Listing title as shown by the source. */
  title: string;
  /** Outbound product/page URL. */
  link: string;
  /** Merchant / site name (e.g. "Coupang", "Amazon.com"). */
  source: string;
  /** Listing thumbnail, when present. */
  thumbnail?: string;
  /** Human price string as returned (e.g. "₩19,900"). */
  priceText?: string;
  /** Numeric price when SerpAPI extracted one. */
  priceValue?: number;
  /** Currency symbol/code when present. */
  currency?: string;
}

interface RawPrice {
  value?: string;
  extracted_value?: number;
  currency?: string;
}

interface RawVisualMatch {
  position?: number;
  title?: string;
  link?: string;
  source?: string;
  thumbnail?: string;
  price?: RawPrice;
  in_stock?: boolean;
}

interface RawLensResponse {
  visual_matches?: RawVisualMatch[];
  error?: string;
}

/**
 * Map + rank visual matches. Keeps only entries with a title and link; entries
 * that carry a price (i.e. real buyable listings) are ranked ahead of bare
 * reference pages, then by SerpAPI position. `limit` caps the output.
 */
export function mapLensMatches(json: unknown, limit = 24): LensMatch[] {
  const resp = (json ?? {}) as RawLensResponse;
  const raw = Array.isArray(resp.visual_matches) ? resp.visual_matches : [];

  const mapped: Array<LensMatch & { position: number; hasPrice: boolean }> = [];
  for (const m of raw) {
    const title = typeof m.title === 'string' ? m.title.trim() : '';
    const link = typeof m.link === 'string' ? m.link.trim() : '';
    if (!title || !link) continue;
    const source = typeof m.source === 'string' && m.source.trim() ? m.source.trim() : hostOf(link);
    const priceValue =
      typeof m.price?.extracted_value === 'number' && m.price.extracted_value > 0
        ? m.price.extracted_value
        : undefined;
    mapped.push({
      title: title.slice(0, 200),
      link,
      source,
      thumbnail: typeof m.thumbnail === 'string' ? m.thumbnail : undefined,
      priceText: typeof m.price?.value === 'string' ? m.price.value : undefined,
      priceValue,
      currency: typeof m.price?.currency === 'string' ? m.price.currency : undefined,
      position: typeof m.position === 'number' ? m.position : Number.MAX_SAFE_INTEGER,
      hasPrice: priceValue !== undefined,
    });
  }

  mapped.sort((a, b) => {
    if (a.hasPrice !== b.hasPrice) return a.hasPrice ? -1 : 1;
    return a.position - b.position;
  });

  // Dedup by link.
  const seen = new Set<string>();
  const out: LensMatch[] = [];
  for (const m of mapped) {
    if (seen.has(m.link)) continue;
    seen.add(m.link);
    const { position: _p, hasPrice: _h, ...clean } = m;
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}
