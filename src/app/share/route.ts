import { NextResponse } from 'next/server';

/**
 * Web Share Target landing — the OS share sheet hands us {title, text, url}
 * from a sibling app (e.g. Safari sharing a product page, Instagram sharing
 * a post). We pick the most useful piece and bounce to /search with q.
 *
 * Priority:
 *   1) url    — if it's a parseable URL, prefer it (the app's extractor can
 *               pull product info from SNS links).
 *   2) text   — usually the prose body of the share.
 *   3) title  — fallback when nothing else came through.
 *
 * Always 302 → /search?q=… so the user lands on a familiar surface.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const url = (u.searchParams.get('url') ?? '').trim();
  const text = (u.searchParams.get('text') ?? '').trim();
  const title = (u.searchParams.get('title') ?? '').trim();

  // Pick the strongest signal.
  const q = url || text || title;
  if (!q) {
    // Nothing came through — just open the app.
    return NextResponse.redirect(new URL('/', req.url), 302);
  }
  const target = new URL('/search', req.url);
  target.searchParams.set('q', q.slice(0, 400));
  return NextResponse.redirect(target, 302);
}
