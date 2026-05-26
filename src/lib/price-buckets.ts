/**
 * Quantile-based price bucketing for the /search facet chips.
 *
 * We don't bucket by absolute KRW/USD ranges — that would feel arbitrary
 * (a "low" range that suits a notebook is way too high for a t-shirt).
 * Instead, we split the visible products into three roughly-equal-size
 * buckets via 33rd and 67th percentiles of the final-price amounts.
 *
 * Pure (no React / IO). Caller passes the converted amounts; we never
 * touch currency conversion here. Empty / tiny inputs return null so
 * the UI can hide the chip row.
 */
export type PriceBucket = 'low' | 'mid' | 'high';

export interface PriceThresholds {
  /** Inclusive upper bound for the "low" bucket. */
  lowMax: number;
  /** Inclusive upper bound for the "mid" bucket. */
  midMax: number;
}

export function computePriceBuckets(amounts: readonly number[]): PriceThresholds | null {
  // Need at least 6 points to make three meaningful thirds; fewer than
  // that and the chips would just be a re-ordering of the grid.
  if (amounts.length < 6) return null;
  const sorted = [...amounts].filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  if (sorted.length < 6) return null;
  const q33 = sorted[Math.floor(sorted.length / 3)]!;
  const q67 = sorted[Math.floor((sorted.length * 2) / 3)]!;
  // If quantiles collapse onto the same value (lots of duplicate prices),
  // the chips would just shuffle the same group — better to hide.
  if (q33 === q67) return null;
  return { lowMax: q33, midMax: q67 };
}

export function bucketOf(amount: number, t: PriceThresholds): PriceBucket {
  if (amount <= t.lowMax) return 'low';
  if (amount <= t.midMax) return 'mid';
  return 'high';
}
