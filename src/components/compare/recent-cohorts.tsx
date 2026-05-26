'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface Item {
  slug: string;
  winnerName: string | null;
  winnerStore: string | null;
  n: number;
  priority: string;
  locale: string;
  createdAt: string;
  up?: number;
  down?: number;
}

interface ApiResponse {
  items: Item[];
}

/**
 * Footer row on /compare — "다른 사람들의 비교": the 5 most recently shared
 * cohorts surfaced as small linked chips so a visitor can dip into a public
 * compare without leaving Tony. PII-free (just the winner name + store).
 * Renders nothing when Supabase isn't configured or no shares exist.
 *
 * Each chip also shows the anonymous 👍/👎 tally so visitors see signal
 * before they click — no need to open the cohort to learn it's well-loved
 * (or contested).
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
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-extrabold tracking-tighter2 md:text-[18px]">
          {t('title')}
        </h3>
        <Link
          href="/cohorts"
          className="shrink-0 text-[11.5px] font-bold tracking-tight text-accent-700 hover:underline dark:text-accent-300"
        >
          {t('viewAll')} →
        </Link>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.slug}>
            <Link
              href={`/c/${it.slug}`}
              className="block rounded-2xl border border-ink-200 bg-white p-3 transition hover:border-accent-300 hover:bg-accent-50/40 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent-700 dark:hover:bg-accent-950/30"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10.5px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
                  {it.winnerStore ?? '—'} · {it.n}{t('countSuffix')}
                </div>
                <ReactionPills up={it.up ?? 0} down={it.down ?? 0} />
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

function ReactionPills({ up, down }: { up: number; down: number }) {
  if (up === 0 && down === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] font-bold tabular-nums">
      {up > 0 ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <ThumbsUp className="h-2.5 w-2.5" strokeWidth={2.4} />
          {up}
        </span>
      ) : null}
      {down > 0 ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-950/50 dark:text-red-300">
          <ThumbsDown className="h-2.5 w-2.5" strokeWidth={2.4} />
          {down}
        </span>
      ) : null}
    </span>
  );
}
