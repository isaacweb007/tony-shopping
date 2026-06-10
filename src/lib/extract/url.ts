/**
 * URL detection helpers for the link → product pipeline.
 *
 * Users paste links in messy ways: a bare URL, a URL with a caption around it
 * ("이거 어디서 사? https://… 대박"), or a share-sheet payload. The search
 * layer treats its query as a literal product name, so we must recognize when
 * an input is really a link (and pull the URL out) BEFORE it reaches search —
 * otherwise the raw URL becomes the "product name" and the results are garbage.
 *
 * Pure, no IO, no server-only deps — safe to import anywhere and unit-test.
 */

// Matches an http(s) URL embedded anywhere in a string. Stops at whitespace.
const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

/** Trailing punctuation that commonly clings to a pasted URL but isn't part of it. */
const TRAILING_PUNCT = /[.,;:!?)\]}'"»。、，！？]+$/;

/**
 * Extract the first http(s) URL found anywhere in `text`, trimming trailing
 * punctuation. Returns null when there's no URL. Works for bare URLs and for
 * URLs surrounded by caption text.
 */
export function findFirstUrl(text: string): string | null {
  if (!text) return null;
  const m = URL_RE.exec(text);
  if (!m) return null;
  const raw = m[0].replace(TRAILING_PUNCT, '');
  // Validate it actually parses as a URL with a host.
  try {
    const u = new URL(raw);
    if (!u.host) return null;
    return raw;
  } catch {
    return null;
  }
}

/**
 * True when the input is essentially just a URL (optionally with surrounding
 * whitespace) — i.e. the user pasted a link and nothing meaningful else.
 */
export function isUrlOnly(text: string): boolean {
  const t = text.trim();
  const url = findFirstUrl(t);
  if (!url) return false;
  // Whatever remains after removing the URL should be empty/punctuation only.
  const rest = t.replace(url, '').replace(/[\s.,;:!?]+/g, '');
  return rest.length === 0;
}

/**
 * True when the input CONTAINS a URL (bare or inside caption text). This is the
 * signal that the input should go through link extraction rather than being
 * searched verbatim.
 */
export function containsUrl(text: string): boolean {
  return findFirstUrl(text) !== null;
}

/**
 * Lowercased host without a leading "www." — handy for provider checks and
 * display. Returns '' when the string isn't a valid URL.
 */
export function urlHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}
