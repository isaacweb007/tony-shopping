'use client';

import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { DealItem } from '@/app/api/deals/route';
import type { AppLocale } from '@/i18n/routing';

interface DealsResponse {
  dateKey: string;
  deals: DealItem[];
}

/**
 * Fetches the home "오늘의 딜" feed. Content is date-seeded server-side, so the
 * client just needs a generous staleTime — navigating the home page won't
 * refire, and the feed naturally turns over the next day. No history signal
 * required: this is a cold-start retention surface, shown to everyone.
 */
export function useDeals() {
  const locale = useLocale() as AppLocale;
  return useQuery<DealsResponse>({
    queryKey: ['deals', locale],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/deals?locale=${locale}`);
      if (!res.ok) throw new Error(`deals http ${res.status}`);
      return (await res.json()) as DealsResponse;
    },
  });
}
