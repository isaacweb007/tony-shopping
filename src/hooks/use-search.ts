'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { searchProducts } from '@/lib/api/search-client';
import { useSearchStore } from '@/stores/search-store';
import { useShortlistStore } from '@/stores/shortlist-store';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { toast } from '@/stores/toast-store';

/**
 * useSearch — fetches results from `/api/search` and mirrors them into the
 * Zustand search store so the AI chat panel & filter UI can read synchronously.
 *
 * Also reconciles each result against the price-watch ledger and toasts the
 * user when a watched item's price dropped past the threshold.
 *
 * Passing an empty `q` disables the query.
 */
export function useSearch(q: string) {
  const setResult = useSearchStore((s) => s.setResult);
  const watchedIds = useShortlistStore((s) => s.ids);
  const observe = usePriceWatchStore((s) => s.observe);
  const tw = useTranslations('watch');

  const query = useQuery({
    queryKey: ['search', q],
    queryFn: ({ signal }) => searchProducts(q, signal),
    enabled: q.length > 0,
    staleTime: 60_000,
  });

  React.useEffect(() => {
    if (!query.data) return;
    setResult(query.data);

    // Reconcile prices for compare-list items present in this result set.
    const watched = query.data.products.filter((p) => watchedIds.includes(p.id));
    if (watched.length === 0) return;
    const dropped = observe(watched);
    for (const p of dropped) {
      toast.success(tw('dropTitle'), tw('dropDesc', { name: p.name }));
    }
  }, [query.data, setResult, watchedIds, observe, tw]);

  return query;
}
