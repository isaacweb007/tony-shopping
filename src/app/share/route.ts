import { NextResponse } from 'next/server';
import { findFirstUrl } from '@/lib/extract/url';

/**
 * Web Share Target landing — the OS share sheet hands us {title, text, url}
 * from a sibling app (e.g. Safari sharing a product page, Instagram sharing
 * a post).
 *
 * Routing:
 *   - If a URL is present (in `url`, or embedded in `text`/`title`), bounce to
 *     the home page with `?ingest=<url>`. The AskBox picks that up on mount and
 *     runs the full link-extraction pipeline (oEmbed/OG + vision) so the search
 *     gets a real PRODUCT query — not the raw URL string, which the search
 *     treats as a literal product name and returns garbage for.
 *   - If there's no URL (plain shared text), it IS a usable query → /search?q=.
 *
 * We deliberately do NOT run extraction here: it makes network + vision calls
 * that can take several seconds, which would stall this redirect. The client
 * runs it with a visible "분석 중" state instead.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const url = (u.searchParams.get('url') ?? '').trim();
  const text = (u.searchParams.get('text') ?? '').trim();
  const title = (u.searchParams.get('title') ?? '').trim();

  // A shared link can arrive in any of the three fields — prefer a real URL.
  const sharedUrl = findFirstUrl(url) || findFirstUrl(text) || findFirstUrl(title);
  if (sharedUrl) {
    const target = new URL('/', req.url);
    target.searchParams.set('ingest', sharedUrl.slice(0, 2000));
    return NextResponse.redirect(target, 302);
  }

  // No URL — treat the shared prose as a search query.
  const q = text || title;
  if (!q) {
    return NextResponse.redirect(new URL('/', req.url), 302);
  }
  const target = new URL('/search', req.url);
  target.searchParams.set('q', q.slice(0, 400));
  return NextResponse.redirect(target, 302);
}
