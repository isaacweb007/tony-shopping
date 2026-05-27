'use client';

import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/types/product';
import type { AlternativesResult } from '@/lib/product-alternatives';
import type { AppLocale } from '@/i18n/routing';

/**
 * Fetches Claude-suggested alternative products for a given canonical
 * product (typically the verdict winner). Keyed by product.id + locale.
 * 1-hour stale matches the server edge cache.
 */
export function useProductAlternatives(product: Product | null | undefined) {
  const locale = useLocale() as AppLocale;

  return useQuery<AlternativesResult>({
    enabled: !!product,
    queryKey: ['product-alternatives', product?.id, locale],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!product) {
        return { alternatives: [], source: 'fallback' } as AlternativesResult;
      }
      const res = await fetch('/api/product/alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          store: product.merchantName ?? product.store,
          price: product.finalPrice.amount,
          currency: product.finalPrice.currency,
          locale,
        }),
      });
      if (!res.ok) throw new Error(`alternatives http ${res.status}`);
      return (await res.json()) as AlternativesResult;
    },
  });
}
