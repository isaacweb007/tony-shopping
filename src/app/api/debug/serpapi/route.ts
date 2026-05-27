/**
 * Diagnostic endpoint for SerpAPI integration.
 *
 * Visible state without leaking the key:
 *  - SerpAPI account info (plan, quota, searches remaining)
 *  - One sample search trace (count, first item, error if any)
 *
 * Hit it once after a deploy to confirm the live adapter is wired up.
 * URL: /api/debug/serpapi?q=airpods&locale=ko
 *
 * NOTE: This endpoint never returns the API key itself, only metadata.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AccountInfo {
  account_email?: string;
  plan_name?: string;
  searches_per_month?: number;
  this_month_usage?: number;
  total_searches_left?: number;
  account_status?: string;
}

interface SerpItem {
  position?: number;
  title?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  thumbnail?: string;
  link?: string;
}

interface SerpResp {
  shopping_results?: SerpItem[];
  error?: string;
  search_metadata?: { status?: string; total_time_taken?: number };
}

export async function GET(req: NextRequest) {
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'SERPAPI_KEY not set on this deployment',
      },
      { status: 200 },
    );
  }

  const q = req.nextUrl.searchParams.get('q') || 'airpods pro';
  const locale = (req.nextUrl.searchParams.get('locale') || 'ko') as 'ko' | 'en' | 'vi';

  // 1) Check account quota.
  let account: AccountInfo | { error: string } = { error: 'not_fetched' };
  try {
    const accRes = await fetch(`https://serpapi.com/account?api_key=${key}`, {
      cache: 'no-store',
    });
    if (accRes.ok) {
      account = (await accRes.json()) as AccountInfo;
    } else {
      account = { error: `account http ${accRes.status}` };
    }
  } catch (e) {
    account = { error: e instanceof Error ? e.message : 'fetch_failed' };
  }

  // 2) One live sample search.
  const localeMap = {
    ko: { gl: 'kr', hl: 'ko', google_domain: 'google.co.kr', location: 'Seoul, South Korea' },
    en: { gl: 'us', hl: 'en', google_domain: 'google.com', location: 'United States' },
    vi: { gl: 'vn', hl: 'vi', google_domain: 'google.com.vn', location: 'Ho Chi Minh City, Vietnam' },
  };
  const loc = localeMap[locale];
  const params = new URLSearchParams({
    engine: 'google_shopping',
    q,
    num: '10',
    api_key: key,
    gl: loc.gl,
    hl: loc.hl,
    google_domain: loc.google_domain,
    location: loc.location,
    device: 'desktop',
  });

  const t0 = Date.now();
  let sample: {
    httpStatus?: number;
    durationMs: number;
    apiError?: string;
    resultCount: number;
    firstItem?: SerpItem;
    metadataStatus?: string;
  } = { durationMs: 0, resultCount: 0 };

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const data = (await res.json().catch(() => null)) as SerpResp | null;
    sample = {
      httpStatus: res.status,
      durationMs: Date.now() - t0,
      apiError: data?.error,
      resultCount: data?.shopping_results?.length ?? 0,
      firstItem: data?.shopping_results?.[0],
      metadataStatus: data?.search_metadata?.status,
    };
  } catch (e) {
    sample = {
      durationMs: Date.now() - t0,
      resultCount: 0,
      apiError: e instanceof Error ? e.message : 'fetch_threw',
    };
  }

  return NextResponse.json(
    {
      ok: true,
      keyPresent: true,
      keyTail: '...' + key.slice(-4), // last 4 chars only — for identifying which key is loaded
      account,
      sample,
      query: { q, locale },
    },
    { status: 200 },
  );
}
