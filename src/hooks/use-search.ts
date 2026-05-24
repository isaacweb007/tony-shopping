'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProducts } from '@/lib/api/search-client';
import { useSearchStore } from '@/stores/search-store';

/**
 * useSearch — fetches results from `/api/search` and mirrors them into the
 * Zustand search store so the AI chat panel & filter UI can read synchronously.
 *
 * Passing an empty `q` disables the query.
 */
export function useSearch(q: string) {
  const setResult = useSearchStore((s) => s.setResult);

  const query = useQuery({
    queryKey: ['search', q],
    queryFn: ({ signal }) => searchProducts(q, signal),
    enabled: q.length > 0,
    staleTime: 60_000,
  });

  // Mirror successful data into the store so chat / filters can act on it.
  React.useEffect(() => {
    if (query.data) setResult(query.data);
  }, [query.data, setResult]);

  return query;
}
