/**
 * GET /api/deals — the home "오늘의 딜" feed.
 *
 * Re-runs Tony's search for a date-seeded subset of popular queries and returns
 * the best-priced results, ranked by selectDeals(). The seed selection is keyed
 * to the KST date so the feed is stable within a day and refreshes at midnight —
 * the daily hook for habitual users.
 *
 * Cost control: results are memoised per (dateKey, locale) in a module-level
 * cache for an hour, so a warm serverless instance doesn't re-run the searches
 * on every home-page hit. The deterministic dateKey also makes the response
 * CDN-cacheable.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { runServerSearch } from '@/lib/search/run';
import { pickDailySeeds, todayKeyKST } from '@/lib/deals/seeds';
import { selectDeals, type DealGroup } from '@/lib/deals/build-deals';
import type { Money } from '@/types/product';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DAILY_SEED_COUNT = 6;
const DEALS_RETURNED = 6;
const MEMO_TTL_MS = 60 * 60 * 1000;

const LocaleSchema = z.enum(['ko', 'en', 'vi']).catch('ko');

export interface DealItem {
  id: string;
  name: string;
  store: string;
  merchantName?: string;
  imageUrl: string;
  finalPrice: Money;
  /** Strikethrough "before" price, same currency as finalPrice. */
  referencePrice: Money;
  discountPct: number;
  savings: Money;
  shipDays: number;
  rating: number;
  reviewCount: number;
  scoreTotal: number;
  category: string;
  /** Seed query for the card's click-through to /search. */
  query: string;
}

interface DealsPayload {
  dateKey: string;
  deals: DealItem[];
}

// Module-level memo, survives across requests on a warm instance.
const memo = new Map<string, { at: number; payload: DealsPayload }>();

export async function GET(req: NextRequest) {
  const locale = LocaleSchema.parse(req.nextUrl.searchParams.get('locale') ?? 'ko');
  const dateKey = todayKeyKST();
  const cacheKey = `${dateKey}:${locale}`;

  const cached = memo.get(cacheKey);
  if (cached && Date.now() - cached.at < MEMO_TTL_MS) {
    return NextResponse.json(cached.payload, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }

  const seeds = pickDailySeeds(dateKey, DAILY_SEED_COUNT);
  // category lookup by query, to tag each deal for the card's fallback icon.
  const categoryByQuery = new Map(seeds.map((s) => [s.query, s.category]));

  const settled = await Promise.allSettled(
    seeds.map((s) =>
      runServerSearch({ q: s.query, attachments: [] }, { signal: req.signal, locale }).then(
        (result): DealGroup => ({ query: s.query, products: result.products }),
      ),
    ),
  );

  const groups: DealGroup[] = settled
    .filter((r): r is PromiseFulfilledResult<DealGroup> => r.status === 'fulfilled')
    .map((r) => r.value);

  const deals = selectDeals(groups, { count: DEALS_RETURNED });

  const payload: DealsPayload = {
    dateKey,
    deals: deals.map((d) => {
      const currency = d.product.finalPrice.currency;
      return {
        id: d.product.id,
        name: d.product.name,
        store: d.product.store,
        merchantName: d.product.merchantName,
        imageUrl: d.product.imageUrl,
        finalPrice: d.product.finalPrice,
        referencePrice: { amount: d.referenceAmount, currency },
        discountPct: d.discountPct,
        savings: { amount: d.savings, currency },
        shipDays: d.product.shipDays,
        rating: d.product.rating,
        reviewCount: d.product.reviewCount,
        scoreTotal: d.product.score.total,
        category: categoryByQuery.get(d.query) ?? 'other',
        query: d.query,
      };
    }),
  };

  memo.set(cacheKey, { at: Date.now(), payload });

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
