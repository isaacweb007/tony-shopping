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
  const hits = new Map<Category, number>();
  let total = 0;

  for (const h of history) {
    if (h.createdAt < since) continue;
    for (const c of categorize(h.q)) {
      hits.set(c, (hits.get(c) ?? 0) + 1);
      total += 1;
    }
  }
  for (const c of clicks) {
    if (c.at < since) continue;
    for (const cat of categorize(c.q)) {
      hits.set(cat, (hits.get(cat) ?? 0) + 1);
      total += 1;
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
  };
}
