/**
 * Filename-only heuristic for image extraction. Pure (no IO, no Node API)
 * so unit tests can import it without dragging in the `server-only` boundary
 * that lives in vision.ts.
 *
 * Returns a cleaned candidate query string (''when nothing useful survives).
 * Used by extractFromImage() when GOOGLE_VISION_API_KEY isn't set.
 */
export function heuristicFromFilename(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  const NOISE_PATTERNS = [
    /^IMG[\s_-]?\d+/i,
    /^DSC[\s_-]?\d+/i,
    /^PXL[\s_-]?\d+/i,
    /^DCIM[\s_-]?\d+/i,
    /^image[\s_-]?\d+/i,
    /^photo[\s_-]?\d+/i,
    /^Screenshot[\s_-]+[\d\s\-_.오전후AMPamp]+/i,
    /^스크린샷[\s_-]+[\d\s\-_.오전후AMPamp]+/i,
    /^KakaoTalk[\s_-]?[\d_\-.]*/i,
  ];
  let cleaned = stem;
  for (const p of NOISE_PATTERNS) {
    cleaned = cleaned.replace(p, '');
  }
  cleaned = cleaned
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\d{6,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  cleaned = cleaned.replace(/^\d+\s+|\s+\d+$/g, '').trim();
  if (cleaned.length < 3) return '';
  return cleaned.slice(0, 80);
}
