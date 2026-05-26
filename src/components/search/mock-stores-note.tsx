'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface StatusResponse {
  overall: {
    anyRealSearch: boolean;
    liveSearchLabels: string[];
    mockSearchLabels: string[];
  };
}

/**
 * Inline transparency note shown under the FilterBar on /search when at
 * least one search adapter is LIVE and at least one is still MOCK. The
 * note names the mock stores so users don't wonder why a particular
 * merchant didn't show up, and links to /setup so the operator can add
 * the missing keys.
 *
 * Hidden when:
 *   - all live → no need (ResultsBadge shows the green "Live · X" pill)
 *   - all mock → already covered by the amber "Demo data" badge
 *   - status payload missing → silent
 */
export function MockStoresNote() {
  const t = useTranslations('search.mockStores');
  const { data } = useQuery({
    queryKey: ['adapter-status'],
    queryFn: async (): Promise<StatusResponse> => {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('status fetch failed');
      return (await res.json()) as StatusResponse;
    },
    staleTime: 60_000,
  });
  if (!data) return null;

  const { anyRealSearch, mockSearchLabels } = data.overall;
  // Only show when there's a mix — pure-mock + pure-live are handled
  // elsewhere (ResultsBadge).
  if (!anyRealSearch || mockSearchLabels.length === 0) return null;

  return (
    <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-200/60 bg-amber-50/40 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
      <span>
        {t('label', {
          stores: mockSearchLabels.slice(0, 4).join(', ') + (mockSearchLabels.length > 4 ? ' …' : ''),
        })}{' '}
        <Link
          href="/setup"
          className="font-bold underline decoration-amber-400 underline-offset-2 hover:decoration-amber-600 dark:decoration-amber-600 dark:hover:decoration-amber-400"
        >
          {t('cta')}
        </Link>
      </span>
    </div>
  );
}
