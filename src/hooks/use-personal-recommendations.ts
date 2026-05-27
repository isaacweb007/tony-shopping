'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useHistoryStore } from '@/stores/history-store';
import { useRecentProductsStore } from '@/stores/recent-products-store';
import type { PersonalResult } from '@/lib/personal-recommendations';
import type { AppLocale } from '@/i18n/routing';

/**
 * Fetches Tony's personalised product suggestions based on local search
 * + click history. Reads zustand stores client-side (no SSR signal —
 * the server doesn't know what the user has been browsing).
 *
 * Stale time 15 min so navigating around the home page doesn't refire.
 * Disabled when the user has effectively no history so we don't burn
 * an LLM call on cold-start visitors.
 */
export function usePersonalRecommendations() {
  const locale = useLocale() as AppLocale;
  const queries = useHistoryStore((s) => s.entries);
  const recentProducts = useRecentProductsStore((s) => s.items);

  // Hash the relevant inputs so React Query keys cache by content. New
  // searches invalidate the cache; same history reuses the call.
  const signalKey = React.useMemo(() => {
    const q = queries.slice(0, 5).map((e) => e.q).join('|');
    const p = recentProducts.slice(0, 5).map((e) => e.name).join('|');
    return `${q}::${p}`;
  }, [queries, recentProducts]);

  const enoughSignal = queries.length + recentProducts.length >= 2;

  return useQuery<PersonalResult>({
    enabled: enoughSignal,
    queryKey: ['personal-recommendations', signalKey, locale],
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      const recentQueries = queries.slice(0, 10).map((e) => e.q);
      const recentClicks = recentProducts.slice(0, 10).map((it) => ({
        name: it.name,
        query: it.query,
      }));
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentQueries, recentClicks, locale }),
      });
      if (!res.ok) throw new Error(`recommendations http ${res.status}`);
      return (await res.json()) as PersonalResult;
    },
  });
}
