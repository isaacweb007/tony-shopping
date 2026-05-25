import { describe, it, expect } from 'vitest';
import { buildCompare } from '@/lib/compare/verdict';
import type { ShortlistSnap } from '@/types/shortlist';

function snap(over: Partial<ShortlistSnap>): ShortlistSnap {
  return {
    id: over.id ?? 'p',
    name: over.name ?? over.id ?? 'product',
    store: over.store ?? 'Coupang',
    finalPrice: over.finalPrice ?? { amount: 100_000, currency: 'KRW' },
    addedAt: over.addedAt ?? 1,
    shipDays: over.shipDays,
    rating: over.rating,
    reviewCount: over.reviewCount,
    authenticityPct: over.authenticityPct,
    official: over.official,
    score: over.score,
  };
}

describe('buildCompare', () => {
  it('returns no winner with < 2 snaps', () => {
    const out = buildCompare([snap({ id: 'a' })], 'balanced');
    expect(out.verdict.winnerId).toBeNull();
  });

  it('picks the cohort winner with clearly-best price + score', () => {
    // USD so the price criterion stays active in node env (KRW→USD would null).
    const cohort = [
      snap({
        id: 'cheap-good',
        finalPrice: { amount: 90, currency: 'USD' },
        shipDays: 1,
        rating: 4.7,
        reviewCount: 2000,
        authenticityPct: 95,
        score: { total: 92, similarity: 90, priceEdge: 88, reviewTrust: 90, authenticity: 95 },
      }),
      snap({
        id: 'expensive-bad',
        finalPrice: { amount: 200, currency: 'USD' },
        shipDays: 7,
        rating: 4.0,
        reviewCount: 100,
        authenticityPct: 60,
        score: { total: 65, similarity: 70, priceEdge: 30, reviewTrust: 60, authenticity: 60 },
      }),
    ];
    const out = buildCompare(cohort, 'balanced');
    expect(out.verdict.winnerId).toBe('cheap-good');
    expect(out.verdict.reasonKeys.length).toBeGreaterThan(0);
  });

  it('shifts winner when priority is "value" — cheapest item wins despite lower tony score', () => {
    // USD prices so the in-test FX cache (cold in node) doesn't drop the
    // price criterion; KRW→USD conversion would return null in node env.
    const cheap = snap({
      id: 'cheap',
      finalPrice: { amount: 50, currency: 'USD' },
      score: { total: 70, similarity: 70, priceEdge: 95, reviewTrust: 65, authenticity: 60 },
    });
    const balanced = snap({
      id: 'balanced',
      finalPrice: { amount: 120, currency: 'USD' },
      score: { total: 90, similarity: 88, priceEdge: 70, reviewTrust: 90, authenticity: 90 },
    });
    const valuePriority = buildCompare([cheap, balanced], 'value');
    expect(valuePriority.verdict.winnerId).toBe('cheap');
  });

  it('shifts winner when priority is "fast"', () => {
    const slow = snap({
      id: 'slow',
      finalPrice: { amount: 80_000, currency: 'KRW' },
      shipDays: 10,
      score: { total: 88, similarity: 85, priceEdge: 80, reviewTrust: 88, authenticity: 88 },
    });
    const fast = snap({
      id: 'fast',
      finalPrice: { amount: 120_000, currency: 'KRW' },
      shipDays: 1,
      score: { total: 80, similarity: 82, priceEdge: 60, reviewTrust: 80, authenticity: 80 },
    });
    const out = buildCompare([slow, fast], 'fast');
    expect(out.verdict.winnerId).toBe('fast');
  });

  it('returns null winner on a true tie', () => {
    const a = snap({ id: 'a', finalPrice: { amount: 100, currency: 'KRW' } });
    const b = snap({ id: 'b', finalPrice: { amount: 100, currency: 'KRW' } });
    const out = buildCompare([a, b], 'balanced');
    // Identical numbers → no normalised lead → no winner declared
    expect(out.verdict.winnerId).toBeNull();
  });

  it('echoes the priority back on the result', () => {
    expect(buildCompare([snap({ id: 'a' }), snap({ id: 'b' })], 'genuine').priority).toBe('genuine');
  });
});
