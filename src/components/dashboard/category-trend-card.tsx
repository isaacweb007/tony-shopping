'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useClickStore } from '@/stores/click-store';
import { useHistoryStore } from '@/stores/history-store';
import { buildCategoryTrend } from '@/lib/insights/trends';

/**
 * "이번 주 카테고리" trend card. Pulls from the local history + click
 * stores, runs them through buildCategoryTrend, and renders a single-line
 * card naming the dominant category + the runner-up. Hides itself when
 * the signal is too thin.
 */
export function CategoryTrendCard() {
  const t = useTranslations('dashboard.trend');
  const clicks = useClickStore((s) => s.events);
  const history = useHistoryStore((s) => s.entries);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const trend = React.useMemo(() => {
    if (!mounted) return null;
    return buildCategoryTrend({
      history: history.map((h) => ({ q: h.q, createdAt: h.createdAt })),
      clicks: clicks.map((c) => ({ q: c.q, at: c.at })),
    });
  }, [mounted, history, clicks]);

  if (!trend) return null;

  // Direction: +ve, -ve, or first week (no prior). Three states, three icons.
  const delta = trend.count - trend.prevCount;
  const direction: 'up' | 'down' | 'flat' | 'new' =
    trend.prevCount === 0 ? 'new' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return (
    <section
      className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-200/60 bg-sky-50/40 px-4 py-3 dark:border-sky-800/40 dark:bg-sky-950/20"
      aria-labelledby="trend-heading"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600/10 text-sky-600 dark:text-sky-300">
        <TrendingUp className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">
          <span>{t('eyebrow')}</span>
          <WowPill direction={direction} delta={delta} t={t} />
        </div>
        <h2 id="trend-heading" className="mt-0.5 text-[16px] font-extrabold tracking-tight md:text-[18px]">
          {t('title', {
            cat: t(`categoryNames.${trend.category}` as 'categoryNames.shoes'),
            n: trend.count,
          })}
        </h2>
        {trend.runnerUp ? (
          <p className="mt-0.5 text-[12px] text-ink-500 dark:text-ink-400">
            {t('runnerUp', {
              cat: t(`categoryNames.${trend.runnerUp}` as 'categoryNames.shoes'),
            })}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function WowPill({
  direction,
  delta,
  t,
}: {
  direction: 'up' | 'down' | 'flat' | 'new';
  delta: number;
  t: ReturnType<typeof useTranslations<'dashboard.trend'>>;
}) {
  if (direction === 'new') {
    // First-week signal — show a neutral "NEW" so the user isn't confused
    // by a missing direction indicator on a category they just started
    // exploring.
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-ink-100 px-1.5 py-0.5 text-[9.5px] font-bold tracking-widest text-ink-600 dark:bg-ink-800 dark:text-ink-300">
        {t('wowNew')}
      </span>
    );
  }
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const cls =
    direction === 'up'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      : direction === 'down'
        ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
        : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300';
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums ${cls}`}>
      <Icon className="h-2.5 w-2.5" strokeWidth={2.6} />
      {sign}{delta}
    </span>
  );
}
