'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';
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

  return (
    <section
      className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-200/60 bg-sky-50/40 px-4 py-3 dark:border-sky-800/40 dark:bg-sky-950/20"
      aria-labelledby="trend-heading"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600/10 text-sky-600 dark:text-sky-300">
        <TrendingUp className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">
          {t('eyebrow')}
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
