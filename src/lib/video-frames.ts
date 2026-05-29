/**
 * Multi-frame extraction for richer video product identification.
 *
 * The single oEmbed cover thumbnail misses products shown mid-video. For
 * YouTube we can pull several frames sampled across the timeline using
 * YouTube's predictable thumbnail URLs:
 *
 *   /vi/{id}/1.jpg  → frame at ~25 % of the video
 *   /vi/{id}/2.jpg  → frame at ~50 %
 *   /vi/{id}/3.jpg  → frame at ~75 %
 *   /vi/{id}/hqdefault.jpg → high-res cover
 *
 * Feeding all of these to Claude vision in one call lets it spot the
 * actual product even when the cover frame is a talking-head intro.
 *
 * TikTok / Instagram don't expose per-timestamp frames publicly, so they
 * stay single-thumbnail (handled by the caller).
 */
import 'server-only';

/** Extract the 11-char YouTube video id from any common YouTube URL form. */
export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0] ?? '';
      return isValidId(id) ? id : null;
    }
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      // watch?v=ID
      const v = u.searchParams.get('v');
      if (v && isValidId(v)) return v;
      // /shorts/ID  or  /embed/ID  or  /live/ID
      const m = u.pathname.match(/\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
      if (m && m[1]) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

function isValidId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

/**
 * Candidate frame URLs for a YouTube video, ordered most-informative first.
 * 1/2/3.jpg are timeline-sampled storyboard frames; hqdefault is the cover.
 * Some may 404 (older videos lack storyboards) — the caller fetches each
 * and silently drops failures.
 */
export function youtubeFrameUrls(id: string): string[] {
  const base = `https://i.ytimg.com/vi/${id}`;
  return [
    `${base}/1.jpg`,
    `${base}/2.jpg`,
    `${base}/3.jpg`,
    `${base}/hqdefault.jpg`,
  ];
}
