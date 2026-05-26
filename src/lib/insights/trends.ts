/**
 * "이번 주 카테고리" trend — picks the dominant category from the user's
 * last 7 days of search queries + click events.
 *
 * Pure (no React / IO). The dashboard consumes this to render a tiny
 * trend card; it returns null when there isn't enough signal (< 3 hits
 * or the top bucket doesn't beat the runner-up by ≥ 1 hit).
 */
import { categorize, type Category } from '@/lib/categorize';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface CategoryTrend {
  category: Category;
  /** Hits in the last 7 days that landed in this category. */
  count: number;
  /** Top alternative (runner-up). null when there isn't a second bucket. */
  runnerUp: Category | null;
  /** Total signal hits considered (history + clicks). */
  sample: number;
  /** Hits the same category got in the *prior* 7 days, for WoW comparison. */
  prevCount: number;
}

interface BuildArgs {
  /** Each entry contributes its `q` to categorisation. */
  history: ReadonlyArray<{ q: string; createdAt: number }>;
  /** Click events whose `q` strings we re-run through categorize(). */
  clicks: ReadonlyArray<{ q: string; at: number }>;
  /** Override for tests. */
  now?: number;
}

export function buildCategoryTrend({
  history,
  clicks,
  now = Date.now(),
}: BuildArgs): CategoryTrend | null {
  const since = now - WEEK_MS;
  const sincePrev = now - 2 * WEEK_MS;
  const hits = new Map<Category, number>();
  const hitsPrev = new Map<Category, number>();
  let total = 0;

  // History and clicks share the same shape after we normalise — bucket by
  // age (this week vs. previous week) so we can compute WoW deltas without
  // a second pass.
  const stream: Array<{ q: string; at: number }> = [
    ...history.map((h) => ({ q: h.q, at: h.createdAt })),
    ...clicks.map((c) => ({ q: c.q, at: c.at })),
  ];
  for (const item of stream) {
    if (item.at < sincePrev) continue;
    const cats = categorize(item.q);
    if (item.at >= since) {
      for (const c of cats) {
        hits.set(c, (hits.get(c) ?? 0) + 1);
        total += 1;
      }
    } else {
      for (const c of cats) {
        hitsPrev.set(c, (hitsPrev.get(c) ?? 0) + 1);
      }
    }
  }

  if (total < 3) return null;

  const ranked = [...hits.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  if (!top) return null;
  const runner = ranked[1];

  // Require at least a 1-hit lead so we don't crown a coin-flip winner.
  if (runner && top[1] - runner[1] < 1) return null;

  return {
    category: top[0],
    count: top[1],
    runnerUp: runner ? runner[0] : null,
    sample: total,
    prevCount: hitsPrev.get(top[0]) ?? 0,
  };
}
