import type { TonyScore } from '@/types/product';

/**
 * Tony Score weights — keep in lock-step with the spec in `토니쇼핑 프로젝트 개요.pdf §19`.
 *
 *   similarity     25%
 *   priceEdge      20%
 *   reviewTrust    15%
 *   authenticity   15%
 *   shippingFit    10%
 *   returnability   5%
 *   genuine         5%
 *   userFit         5%
 *
 * Phase 2 has no user profile, so the last three are folded into authenticity/reviewTrust.
 */
export const SCORE_WEIGHTS = {
  similarity: 0.3,
  priceEdge: 0.25,
  reviewTrust: 0.22,
  authenticity: 0.23,
} as const;

interface ScoreInput {
  similarity: number; // 0..100
  finalPrice: number; // final price (amount)
  referencePrice: number; // reference price for the set
  reviewCount: number;
  authenticityPct: number; // 0..100
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Compute Tony Score from raw signals. Result is integers in 0..100. */
export function computeTonyScore(input: ScoreInput): TonyScore {
  const similarity = clamp(Math.round(input.similarity));

  // priceEdge: cheaper than reference -> higher edge. We map ratio→[0..100].
  const ratio = input.referencePrice / Math.max(1, input.finalPrice);
  const priceEdge = clamp(Math.round(40 + (ratio - 1) * 60));

  // reviewTrust: log-scaled review count, saturating around 5,000 reviews.
  const reviewTrust = clamp(Math.round(50 + Math.log10(Math.max(1, input.reviewCount)) * 14));

  const authenticity = clamp(Math.round(input.authenticityPct));

  const total = clamp(
    Math.round(
      similarity * SCORE_WEIGHTS.similarity +
        priceEdge * SCORE_WEIGHTS.priceEdge +
        reviewTrust * SCORE_WEIGHTS.reviewTrust +
        authenticity * SCORE_WEIGHTS.authenticity,
    ),
  );

  return { total, similarity, priceEdge, reviewTrust, authenticity };
}
