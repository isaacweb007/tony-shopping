/**
 * Query ↔ title relevance, used to replace SerpAPI's position-based fake
 * "similarity" (92 − idx·2). Real meta-search results are returned by Google
 * roughly by relevance, but position is a poor proxy — a cheap unrelated
 * accessory often ranks above the actual product. Scoring on how much of the
 * query the title actually covers makes the "highly similar" badge mean
 * something and feeds a truthful Tony Score.
 *
 * Pure, no IO. Handles mixed Korean/English: Korean titles often concatenate
 * tokens ("갤럭시버즈3프로"), so we match query tokens against BOTH the tokenized
 * title and a despaced form.
 */

/** Tokenize: lowercase, split on non-(letter|number), drop empties. */
export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 1);
}

/** Despaced, punctuation-stripped lowercase form for substring matching. */
function despace(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Relevance in 0..100. A title that covers all query tokens scores ~99; one
 * that covers none scores a neutral floor (the item was still returned for the
 * query, so it's at least topically related — we don't want to zero out the
 * Tony Score). The "highly similar" threshold (>=92) lands at ~87%+ coverage.
 */
export function relevanceScore(query: string, title: string): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 70; // no query signal → neutral
  if (!title) return 30;

  const titleTokens = new Set(tokenize(title));
  const titleFlat = despace(title);

  let covered = 0;
  for (const tok of qTokens) {
    if (titleTokens.has(tok) || (tok.length >= 2 && titleFlat.includes(tok))) {
      covered += 1;
    }
  }
  const coverage = covered / qTokens.length;
  return Math.max(30, Math.min(99, Math.round(45 + coverage * 54)));
}
