/**
 * Derive a clean PRODUCT search query from reverse-image (Google Lens) matches.
 *
 * Lens returns the actual listings of a product, but their titles are noisy:
 * "Apple AirPods Pro 2세대 USB-C 정품 무료배송 당일발송 최저가". For a keyword
 * search we want the brand+model core, not the seller's promo tail. This picks
 * the cleanest short title across the top matches and strips marketing noise —
 * giving an accurate query grounded in real listings, no vision API required.
 *
 * Pure, no IO. Used by the extract route as an identification fallback when
 * Claude vision isn't available, and unit-tested directly.
 */
import type { LensMatch } from './lens-map';

// Korean promo / logistics tokens — unambiguous in marketplace titles (the
// primary market). Safe to strip at the token level.
const NOISE_KO = new Set([
  '정품',
  '정품인증',
  '무료배송',
  '무료',
  '배송',
  '당일발송',
  '당일',
  '익일',
  '최저가',
  '특가',
  '할인',
  '세일',
  '쿠폰',
  '사은품',
  '공식',
  '공식판매',
  '국내',
  '새상품',
  '미개봉',
]);

// English promo is stripped only as PHRASES — token-level English stripping
// breaks real brand names ("New Balance", "Free People", "Brandy Melville").
const NOISE_EN_PHRASE =
  /\b(?:free|fast)\s+shipping\b|\b(?:lowest|best)\s+price\b|\bofficial\s+store\b|\bbrand\s+new\b|\bon\s+sale\b/gi;

/** Strip bracketed promo blocks + noise; collapse whitespace. */
export function cleanTitle(title: string): string {
  const noBrackets = title
    .replace(/[[(【][^\])】]*[\])】]/g, ' ') // remove [..] (..) 【..】 blocks
    .replace(/[|/]+/g, ' ');
  const noEnPromo = noBrackets.replace(NOISE_EN_PHRASE, ' ');
  const kept = noEnPromo
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !NOISE_KO.has(t));
  return kept.join(' ').trim();
}

/**
 * Pick the best product query from Lens matches. Strategy: clean every title,
 * prefer those from price-bearing (buyable) listings, then choose the SHORTEST
 * cleaned title with at least 2 tokens (shortest tends to be the bare
 * brand+model, before sellers pile on adjectives), capped at `max` tokens.
 * Returns '' when nothing usable.
 */
export function deriveQueryFromLens(matches: readonly LensMatch[], max = 7): string {
  if (matches.length === 0) return '';

  const cleaned = matches.map((m) => ({
    text: cleanTitle(m.title),
    hasPrice: m.priceValue !== undefined,
  }));

  const usable = cleaned
    .map((c) => ({ ...c, tokens: c.text.split(/\s+/).filter(Boolean) }))
    .filter((c) => c.tokens.length >= 2);
  if (usable.length === 0) return '';

  // Price-bearing first; among the chosen pool, the shortest title wins.
  const priced = usable.filter((c) => c.hasPrice);
  const pool = priced.length > 0 ? priced : usable;
  pool.sort((a, b) => a.tokens.length - b.tokens.length);

  const best = pool[0]!;
  return best.tokens.slice(0, max).join(' ');
}
