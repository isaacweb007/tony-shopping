'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, ThumbsDown, ThumbsUp, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';

type PriorityFilter = 'all' | 'balanced' | 'value' | 'fast' | 'genuine';
const FILTERS: readonly PriorityFilter[] = ['all', 'balanced', 'value', 'fast', 'genuine'];

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
  total: number;
  error?: string;
}

const PAGE_SIZE = 12;

/**
 * /cohorts — full paginated gallery of publicly-shared compare cohorts.
 * Sibling to the 5-item footer card on /compare; this is the "see all"
 * view. Uses infinite query so the "load more" button extends the same
 * scrollable list rather than paginating page-by-page.
 *
 * 503 (Supabase unconfigured) renders a soft empty-state with a link
 * back to /setup so an operator can wire the env vars.
 */
export function CohortsGallery() {
  const t = useTranslations('compare.gallery');
  const tr = useTranslations('compare.recent');
  // Reuse the existing priority chip labels from /compare so the
  // gallery doesn't need its own translations for "value/fast/genuine".
  const tp = useTranslations('compare.priority');
  const locale = useLocale() as AppLocale;

  const [filter, setFilter] = React.useState<PriorityFilter>('all');

  const query = useInfiniteQuery({
    queryKey: ['cohorts-gallery', filter],
    initialPageParam: 0,
    staleTime: 60_000,
    queryFn: async ({ pageParam }): Promise<ApiResponse> => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageParam as number),
      });
      if (filter !== 'all') params.set('priority', filter);
      const res = await fetch(`/api/cohort/recent?${params.toString()}`, { cache: 'no-store' });
      if (res.status === 503) {
        // Surface the unconfigured state up to the UI so we can render
        // the soft message instead of treating it as a network error.
        return { items: [], total: 0, error: 'supabase_unconfigured' };
      }
      if (!res.ok) throw new Error('failed');
      return (await res.json()) as ApiResponse;
    },
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((a, p) => a + p.items.length, 0);
      if (loaded >= last.total) return undefined;
      return loaded;
    },
  });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  const total = pages[0]?.total ?? 0;
  const supabaseOff = pages[0]?.error === 'supabase_unconfigured';

  return (
    <div className="container max-w-5xl pb-32 pt-10 md:pt-16">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        <Sparkles className="h-3 w-3" strokeWidth={2.4} />
        {tr('eyebrow')}
      </div>
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tighter2 md:text-[36px]">
        {t('title')}
      </h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ink-600 dark:text-ink-300">
        {t('subtitle')}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('filterLabel')}>
        <span className="mr-1 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          {t('filterLabel')}
        </span>
        {FILTERS.map((f) => {
          const active = filter === f;
          // 'all' has no translation under compare.priority, so we use
          // the gallery's own filterAll label for that single chip.
          const label = f === 'all' ? t('filterAll') : tp(f);
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(f)}
              className={cn(
                'inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-bold tracking-tight transition',
                active
                  ? 'border-accent-500 bg-accent-600 text-white shadow-sm dark:border-accent-400 dark:bg-accent-500'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-600',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {supabaseOff ? (
        <div className="mt-10 rounded-3xl border border-dashed border-amber-300/60 bg-amber-50/40 p-8 text-[13.5px] text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          {t('supabaseOff')}
        </div>
      ) : query.isPending ? (
        <GallerySkeleton />
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400">
          {t('empty')}
        </div>
      ) : (
        <>
          <div className="mt-4 text-[12px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
            {t('totalLabel', { n: total })}
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <li key={it.slug}>
                <Link
                  href={`/c/${it.slug}`}
                  className="block rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-accent-300 hover:bg-accent-50/40 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent-700 dark:hover:bg-accent-950/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10.5px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
                      {it.winnerStore ?? '—'} · {it.n}{tr('countSuffix')}
                    </div>
                    <ReactionPills up={it.up ?? 0} down={it.down ?? 0} />
                  </div>
                  <div className="mt-1 line-clamp-2 text-[14.5px] font-semibold leading-snug tracking-tight">
                    {it.winnerName ?? tr('noWinner')}
                  </div>
                  <div className="mt-1 text-[10.5px] text-ink-400 dark:text-ink-500">
                    {formatRelativeTime(new Date(it.createdAt).getTime(), locale)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {query.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="h-11 rounded-xl px-6 font-semibold"
              >
                {query.isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                    {t('loading')}
                  </>
                ) : (
                  t('loadMore')
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="h-20 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800/60"
          aria-hidden
        />
      ))}
    </ul>
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
