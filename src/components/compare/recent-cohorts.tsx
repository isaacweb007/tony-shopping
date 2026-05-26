'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface Item {
  slug: string;
  winnerName: string | null;
  winnerStore: string | null;
  n: number;
  priority: string;
  locale: string;
  createdAt: string;
}

interface ApiResponse {
  items: Item[];
}

/**
 * Footer row on /compare — "다른 사람들의 비교": the 5 most recently shared
 * cohorts surfaced as small linked chips so a visitor can dip into a public
 * compare without leaving Tony. PII-free (just the winner name + store).
 * Renders nothing when Supabase isn't configured or no shares exist.
 */
export function RecentCohorts() {
  const t = useTranslations('compare.recent');

  const { data } = useQuery({
    queryKey: ['recent-cohorts'],
    staleTime: 60_000,
    queryFn: async (): Promise<ApiResponse> => {
      const res = await fetch('/api/cohort/recent', { cache: 'no-store' });
      if (!res.ok) return { items: [] };
      return (await res.json()) as ApiResponse;
    },
  });

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mt-12 border-t border-ink-200 pt-6 dark:border-ink-800">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        <Sparkles className="h-3 w-3" strokeWidth={2.4} />
        {t('eyebrow')}
      </div>
      <h3 className="mt-1 text-[16px] font-extrabold tracking-tighter2 md:text-[18px]">
        {t('title')}
      </h3>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.slug}>
            <Link
              href={`/c/${it.slug}`}
              className="block rounded-2xl border border-ink-200 bg-white p-3 transition hover:border-accent-300 hover:bg-accent-50/40 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent-700 dark:hover:bg-accent-950/30"
            >
              <div className="text-[10.5px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
                {it.winnerStore ?? '—'} · {it.n}{t('countSuffix')}
              </div>
              <div className="mt-0.5 line-clamp-1 text-[13.5px] font-semibold tracking-tight">
                {it.winnerName ?? t('noWinner')}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
