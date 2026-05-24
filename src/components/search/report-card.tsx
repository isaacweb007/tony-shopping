'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, ShieldCheck } from 'lucide-react';
import type { TonyReport } from '@/types/product';
import { formatMoney, shipLabel } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

export function ReportCard({ report }: { report: TonyReport }) {
  const t = useTranslations('search');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;

  const reportText = t('reportTpl', {
    total: report.total,
    high: report.highlySimilar,
    sim: report.similar,
    fastestStore: report.fastest.store,
    fastestEta: shipLabel(report.fastest.shipDays, tg),
    cheapestStore: report.cheapest.store,
    cheapestPrice: formatMoney(report.cheapest.finalPrice, locale),
    bestStore: report.best.store,
    bestName: report.best.name,
  });

  return (
    <div className="relative mt-6 rounded-3xl border border-accent-200/70 bg-gradient-to-br from-accent-50/70 via-white to-white p-5 shadow-card dark:border-accent-800/40 dark:from-accent-950/40 dark:via-ink-900 dark:to-ink-900 md:p-7">
      <div className="absolute -top-3 left-5 inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold text-white dark:bg-white dark:text-ink-900">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {t('report')}
      </div>
      <p className="text-[14.5px] leading-relaxed text-ink-800 dark:text-ink-100 md:text-[15.5px]">
        {reportText}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Chip>
          <Sparkles className="h-3 w-3 text-accent-600 dark:text-accent-400" strokeWidth={2} />
          {t('avgScore', { n: report.avgTony })}
        </Chip>
        <Chip>
          <ShieldCheck className="h-3 w-3" strokeWidth={2} />
          {t('avgAuth', { n: report.avgAuthenticity })}
        </Chip>
        <Chip>
          {t('minPriceFastEta', {
            price: formatMoney(report.cheapest.finalPrice, locale),
            eta: shipLabel(report.fastest.shipDays, tg),
          })}
        </Chip>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold dark:border-ink-700 dark:bg-ink-900">
      {children}
    </span>
  );
}
