'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import type { Product } from '@/types/product';
import type { AppLocale } from '@/i18n/routing';

export interface ReviewAnalysisDto {
  summary: string;
  positives: string[];
  negatives: string[];
  authenticityScore: number;
  source: 'anthropic' | 'openai' | 'heuristic';
}

/**
 * Lazily fetches Tony's review analysis for a given product. Cached by
 * product id + locale via React Query — opening the same product dialog
 * twice in a session hits the cache, not the LLM.
 *
 * Disabled when the product has no review samples (e.g., real-API products
 * for stores that don't return review text in the search response yet).
 */
export function useReviewAnalysis(product: Product | null) {
  const locale = useLocale() as AppLocale;

  return useQuery({
    enabled: !!product && (product.reviewSamples?.length ?? 0) > 0,
    queryKey: ['review-analysis', product?.id, locale],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!product) throw new Error('no product');
      const res = await fetch('/api/review-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          store: product.store,
          rating: product.rating,
          reviewCount: product.reviewCount,
          authenticityPct: product.authenticityPct,
          reviewSamples: product.reviewSamples ?? [],
          locale,
        }),
      });
      if (!res.ok) throw new Error('review summary failed');
      return (await res.json()) as ReviewAnalysisDto;
    },
  });
}
