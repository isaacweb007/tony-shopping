'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ShieldCheck, Star, Truck } from 'lucide-react';
import type { Product, TonyReport } from '@/types/product';
import { formatCount, shipLabel, storeDisplay } from '@/lib/format';
import { DualMoney } from '@/components/ui/dual-money';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  products: Product[];
  report: TonyReport;
}

/**
 * MetricsTiles — a 4-up KPI strip that summarises the shopping-relevant
 * dimensions of the result set in tiles a user can read at a glance.
 *
 *   ┌────────┬────────┬────────┬────────┐
 *   │최저가  │최고가  │평점평균│정품률  │
 *   │$X      │$Y      │★4.6    │87%     │
 *   │쿠팡    │KREAM   │N리뷰   │공식상점 │
 *   └────────┴────────┴────────┴────────┘
 *
 * Sits between the VerdictCard and the narrative ReportCard. The verdict
 * answers "which one"; the tiles answer "and what's the landscape?" — useful
 * for users who want to feel grounded before clicking the recommendation.
 */
export function MetricsTiles({ products, report }: Props) {
  const t = useTranslations('metricsTiles');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;

  // Derive headline numbers off the result set. Cheapest/fastest are already
  // computed by the runner; for top-rated and price spread we walk the list
  // once here.
  const stats = React.useMemo(() => {
    if (products.length === 0) return null;
    let topRated: Product = products[0]!;
    let priceMin: Product = products[0]!;
    let priceMax: Product = products[0]!;
    for (const p of products) {
      if (p.rating > topRated.rating) topRated = p;
      else if (p.rating === topRated.rating && p.reviewCount > topRated.reviewCount) {
        topRated = p;
      }
      if (p.finalPrice.amount < priceMin.finalPrice.amount) priceMin = p;
      if (p.finalPrice.amount > priceMax.finalPrice.amount) priceMax = p;
    }
    const median = (() => {
      const arr = products.map((p) => p.finalPrice.amount).sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 === 0 ? Math.round((arr[mid - 1]! + arr[mid]!) / 2) : arr[mid]!;
    })();
    const cheapestSavingsPct = Math.max(
      0,
      Math.round(((median - priceMin.finalPrice.amount) / Math.max(median, 1)) * 100),
    );
    return { topRated, priceMin, priceMax, median, cheapestSavingsPct };
  }, [products]);

  if (!stats) return null;

  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      {/* Cheapest */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-ink-900 dark:to-emerald-950/20 md:p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          <ArrowDown className="h-3 w-3" strokeWidth={2.6} />
          {t('cheapest')}
        </div>
        <div className="mt-1.5">
          <DualMoney money={stats.priceMin.finalPrice} size="lg" layout="stacked" />
        </div>
        <div className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
          {storeDisplay(stats.priceMin)}
        </div>
        {stats.cheapestSavingsPct > 0 && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:border-emerald-700 dark:bg-ink-950 dark:text-emerald-300">
            {t('belowMedian', { pct: stats.cheapestSavingsPct })}
          </div>
        )}
      </div>

      {/* Highest priced — useful as anchor */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-gradient-to-br from-white via-white to-ink-50/60 p-3.5 dark:border-ink-800 dark:from-ink-900 dark:via-ink-900 dark:to-ink-800/50 md:p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          <ArrowUp className="h-3 w-3" strokeWidth={2.6} />
          {t('highest')}
        </div>
        <div className="mt-1.5">
          <DualMoney money={stats.priceMax.finalPrice} size="lg" layout="stacked" />
        </div>
        <div className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
          {storeDisplay(stats.priceMax)}
        </div>
      </div>

      {/* Top rated */}
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-3.5 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-ink-900 dark:to-amber-950/10 md:p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" strokeWidth={2.6} />
          {t('topRated')}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <div className="text-[20px] font-extrabold tabular-nums leading-none tracking-tighter md:text-[24px]">
            {stats.topRated.rating.toFixed(1)}
          </div>
          <div className="text-[11px] text-ink-500 dark:text-ink-400">
            {t('reviewsCount', { n: formatCount(stats.topRated.reviewCount, locale) })}
          </div>
        </div>
        <div className="mt-1 line-clamp-1 text-[11px] text-ink-500 dark:text-ink-400">
          {storeDisplay(stats.topRated)}
        </div>
      </div>

      {/* Authenticity / shipping signal */}
      <div className="overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-50/40 p-3.5 dark:border-sky-900/40 dark:from-sky-950/20 dark:via-ink-900 dark:to-sky-950/10 md:p-4">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">
          <ShieldCheck className="h-3 w-3" strokeWidth={2.6} />
          {t('avgAuth')}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <div className="text-[20px] font-extrabold tabular-nums leading-none tracking-tighter md:text-[24px]">
            {Math.round(report.avgAuthenticity)}%
          </div>
        </div>
        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ink-600 dark:text-ink-300">
          <Truck className="h-3 w-3" strokeWidth={1.8} />
          <span>
            {t('fastest', { eta: shipLabel(report.fastest.shipDays, tg) })}
          </span>
        </div>
      </div>
    </div>
  );
}
