'use client';

import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/types/product';
import type { ProductAnalysis } from '@/lib/product-analysis';
import type { AppLocale } from '@/i18n/routing';

/**
 * Fetches Tony's Claude-powered depth analysis for a single product.
 * Keyed by product.id + locale so switching locale re-fetches (specs
 * + tips need to come back in the user's language). Stale-cache 1 hour
 * matches the server cache header.
 */
export function useProductAnalysis(product: Product) {
  const locale = useLocale() as AppLocale;

  return useQuery<ProductAnalysis>({
    queryKey: ['product-analysis', product.id, locale],
    staleTime: 60 * 60 * 1000, // 1 hour
    queryFn: async () => {
      const res = await fetch('/api/product/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          store: product.merchantName ?? product.store,
          price: product.finalPrice.amount,
          currency: product.finalPrice.currency,
          rating: product.rating,
          reviewCount: product.reviewCount,
          authenticityPct: product.authenticityPct,
          official: product.official,
          shipDays: product.shipDays,
          locale,
          otherMerchantPrices: (product.offers ?? []).slice(0, 6).map((o) => ({
            merchant: o.merchantName,
            price: o.price.amount,
          })),
        }),
      });
      if (!res.ok) {
        throw new Error(`product analysis http ${res.status}`);
      }
      return (await res.json()) as ProductAnalysis;
    },
  });
}
