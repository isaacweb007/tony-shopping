'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Coins, Info } from 'lucide-react';
import { useClickStore } from '@/stores/click-store';
import { buildRevenueEstimate } from '@/lib/insights/revenue';
import { formatMoneyLocale } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

/**
 * Revenue-potential KPI block — sits under the StatCard row on the
 * dashboard. Computes a directional estimate from the last 30 days of local
 * outbound clicks × per-store commission tiers × assumed conversion. The
 * tooltip + disclaimer copy makes it very clear these are estimates.
 *
 * Hidden when there's nothing to show.
 */
export function RevenueCard() {
  const t = useTranslations('dashboard.revenue');
  const locale = useLocale() as AppLocale;
  const clicks = useClickStore((s) => s.events);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const est = React.useMemo(() => buildRevenueEstimate({ clicks }), [clicks]);
  if (!mounted || est.clicks === 0) return null;

  return (
    <section
      className="mt-4 overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-5 dark:border-amber-800/40 dark:from-amber-950/30 dark:via-ink-900 dark:to-yellow-950/20"
      aria-labelledby="revenue-heading"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
        <Coins className="h-3 w-3" strokeWidth={2.4} />
        {t('eyebrow')}
      </div>
      <h2 id="revenue-heading" className="mt-2 text-[26px] font-extrabold tracking-tighter2 md:text-[32px]">
        {formatMoneyLocale({ amount: est.totalKrw, currency: 'KRW' }, locale)}
      </h2>
      <p className="mt-0.5 text-[12.5px] text-ink-600 dark:text-ink-300">
        {t('caption', { clicks: est.clicks })}
      </p>

      {est.perStore.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {est.perStore.slice(0, 6).map((row) => (
            <li
              key={row.store}
              className="flex items-baseline justify-between rounded-xl border border-ink-200 bg-white/60 px-3 py-2 text-[12.5px] dark:border-ink-700 dark:bg-ink-900/60"
            >
              <span className="font-semibold text-ink-700 dark:text-ink-200">{row.store}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="font-extrabold tracking-tighter2">
                  {formatMoneyLocale({ amount: row.krw, currency: 'KRW' }, locale)}
                </span>
                <span className="text-[10.5px] text-ink-400 dark:text-ink-500">
                  {row.clicks}c · {(row.rate * 100).toFixed(1)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 inline-flex items-start gap-1 text-[11px] text-ink-500 dark:text-ink-400">
        <Info className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
        {t('disclaimer')}
      </p>
    </section>
  );
}
