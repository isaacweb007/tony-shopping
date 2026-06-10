'use client';

import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { LensMatch } from '@/lib/search/lens-map';
import type { AppLocale } from '@/i18n/routing';

interface VisualMatchesResponse {
  matches: LensMatch[];
}

/**
 * Fetches reverse-image "where is this sold" matches for a source image URL
 * (an SNS post thumbnail carried via /search?img=…). Disabled when there's no
 * image. Returns an empty list when SERPAPI_KEY isn't configured, so the UI
 * simply renders nothing rather than erroring.
 */
export function useVisualMatches(imageUrl: string | null) {
  const locale = useLocale() as AppLocale;
  return useQuery<VisualMatchesResponse>({
    enabled: !!imageUrl,
    queryKey: ['visual-search', imageUrl, locale],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(
        `/api/visual-search?imageUrl=${encodeURIComponent(imageUrl!)}&locale=${locale}`,
      );
      if (!res.ok) throw new Error(`visual-search http ${res.status}`);
      return (await res.json()) as VisualMatchesResponse;
    },
  });
}
