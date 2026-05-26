'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Share2, Users } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useMySharesStore } from '@/stores/my-shares-store';

/**
 * "내가 공유한 비교" card — gives the user a stable launcher back into
 * /cohorts after they've shared. Cohort shares are anonymous server-side,
 * so the count comes from the local my-shares-store (slugs the user
 * created on this device). Hidden until ≥ 1 share so a fresh dashboard
 * doesn't grow visual weight for no payoff.
 *
 * When the user has shared at least one cohort, we also pull metadata
 * via /api/cohort/by-slugs and surface the top-3 by clone count so the
 * user sees which of their compares are catching on.
 */
interface CohortMeta {
  slug: string;
  winnerName: string | null;
  winnerStore: string | null;
  n: number;
  clones: number;
}

interface ApiResponse {
  items: CohortMeta[];
}

export function MySharesCard() {
  const t = useTranslations('dashboard.myShares');
  const slugs = useMySharesStore((s) => s.slugs);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Take up to 50 (matches the server cap) — the by-slugs endpoint hard-caps
  // this anyway, so we cap on the client too to avoid wasting a request.
  const slugsToFetch = React.useMemo(() => slugs.slice(0, 50), [slugs]);

  const query = useQuery({
    queryKey: ['my-shares-meta', slugsToFetch.join(',')],
    enabled: mounted && slugsToFetch.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ApiResponse> => {
      const res = await fetch(`/api/cohort/by-slugs?slugs=${encodeURIComponent(slugsToFetch.join(','))}`, {
        cache: 'no-store',
      });
      if (!res.ok) return { items: [] };
      return (await res.json()) as ApiResponse;
    },
  });

  if (!mounted || slugs.length === 0) return null;

  // Rank by clones desc; ties broken by snap count (more snaps = "bigger"
  // cohort, more "completeness" of the user's effort).
  const ranked = [...(query.data?.items ?? [])].sort((a, b) => {
    if (a.clones !== b.clones) return b.clones - a.clones;
    return b.n - a.n;
  });
  const topThree = ranked.slice(0, 3);
  const anyClones = ranked.some((it) => it.clones > 0);

  return (
    <section className="mt-6 rounded-2xl border border-accent-200 bg-accent-50/40 p-4 dark:border-accent-800/50 dark:bg-accent-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
            <Share2 className="h-3 w-3" strokeWidth={2.4} />
            {t('eyebrow')}
          </div>
          <p className="mt-1 text-[14.5px] font-semibold tracking-tight text-ink-800 dark:text-ink-100">
            {t('title', { n: slugs.length })}
          </p>
        </div>
        <Link
          href="/cohorts"
          className="shrink-0 rounded-xl bg-accent-600 px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-400"
        >
          {t('cta')}
        </Link>
      </div>

      {topThree.length > 0 && (
        <div className="mt-4 border-t border-accent-200/60 pt-3 dark:border-accent-800/40">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
            {t('popularEyebrow')}
          </div>
          {anyClones ? (
            <ul className="mt-2 space-y-1.5">
              {topThree.map((it) => (
                <li key={it.slug}>
                  <Link
                    href={`/c/${it.slug}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[12.5px] transition hover:bg-accent-100/50 dark:hover:bg-accent-900/40"
                  >
                    <span className="truncate font-semibold text-ink-800 dark:text-ink-100">
                      {it.winnerName ?? '(—)'}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold tabular-nums text-accent-700 dark:text-accent-300">
                      <Users className="h-3 w-3" strokeWidth={2.4} />
                      {it.clones}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11.5px] text-ink-500 dark:text-ink-400">
              {t('popularEmpty')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
