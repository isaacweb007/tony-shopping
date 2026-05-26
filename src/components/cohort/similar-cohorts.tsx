'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, ThumbsUp } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';
import { formatRelativeTime } from '@/lib/format';

interface Item {
  slug: string;
  winnerName: string | null;
  winnerStore: string | null;
  n: number;
  createdAt: string;
  up?: number;
}

interface ApiResponse {
  items: Item[];
}

interface Props {
  /** Slug being viewed — excluded from suggestions. */
  currentSlug: string;
  /** Winner's store on the current cohort — used to filter suggestions. */
  winnerStore: string | null;
}

/**
 * "비슷한 비교" — small footer block on /c/{slug} that surfaces up to
 * 3 other public cohorts whose winner shares the same store. Helps a
 * visitor riff sideways without going back to the gallery.
 *
 * We fetch a wide-ish window (20 most recent) from /api/cohort/recent
 * and filter client-side by winnerStore. The window-cap means very old
 * cohorts won't surface — acceptable for "similar" framing.
 *
 * Hidden when there's no winnerStore or no matching siblings.
 */
export function SimilarCohorts({ currentSlug, winnerStore }: Props) {
  const t = useTranslations('compare.similar');
  const locale = useLocale() as AppLocale;

  const { data } = useQuery({
    queryKey: ['similar-cohorts', winnerStore],
    enabled: !!winnerStore,
    staleTime: 120_000,
    queryFn: async (): Promise<ApiResponse> => {
      const res = await fetch('/api/cohort/recent?limit=20', { cache: 'no-store' });
      if (!res.ok) return { items: [] };
      return (await res.json()) as ApiResponse;
    },
  });

  if (!winnerStore) return null;
  const candidates = (data?.items ?? [])
    .filter((it) => it.slug !== currentSlug && it.winnerStore === winnerStore)
    .slice(0, 3);
  if (candidates.length === 0) return null;

  return (
    <section className="mt-8 border-t border-ink-200 pt-6 dark:border-ink-800">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        <Sparkles className="h-3 w-3" strokeWidth={2.4} />
        {t('eyebrow', { store: winnerStore })}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {candidates.map((it) => (
          <li key={it.slug}>
            <Link
              href={`/c/${it.slug}`}
              className="block rounded-2xl border border-ink-200 bg-white p-3 transition hover:border-accent-300 hover:bg-accent-50/40 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent-700 dark:hover:bg-accent-950/30"
            >
              <div className="flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
                <span>{it.n} · {formatRelativeTime(new Date(it.createdAt).getTime(), locale)}</span>
                {it.up && it.up > 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <ThumbsUp className="h-2.5 w-2.5" strokeWidth={2.4} />
                    {it.up}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 line-clamp-2 text-[13px] font-semibold leading-tight tracking-tight">
                {it.winnerName ?? '—'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
