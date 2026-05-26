'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, MousePointer2, Search, Sparkles } from 'lucide-react';
import { StatCard } from './stat-card';
import { DonutChart } from './donut-chart';
import { CategoryBars } from './category-bars';
import { InsightsRow } from './insights-row';
import { RevenueCard } from './revenue-card';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { formatCount } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

const STORE_LABELS: Record<string, string> = {
  Coupang: 'Coupang',
  Amazon: 'Amazon',
  eBay: 'eBay',
  Shopee: 'Shopee',
  Lazada: 'Lazada',
  NaverShopping: '네이버쇼핑',
  AliExpress: 'AliExpress',
  Gmarket: 'Gmarket',
  '11st': '11번가',
  TikTokShop: 'TikTok Shop',
  GoogleShopping: 'Google Shopping',
  Rakuten: '楽天',
  YahooJP: 'Yahoo! JP',
};

export function DashboardView() {
  const t = useTranslations('dashboard');
  const locale = useLocale() as AppLocale;
  const stats = useDashboardStats();

  const verdictRate =
    stats.clicks > 0 ? Math.round((stats.verdictClicks / stats.clicks) * 100) : 0;

  return (
    <div className="container max-w-6xl pb-24 pt-8 md:pb-32 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tighter2 md:text-[34px]">
            {t('heading')}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-500 dark:text-ink-400">{t('subtitle')}</p>
        </div>
        <span
          className={
            stats.signedIn
              ? 'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[11px] font-bold text-ink-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300'
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {stats.signedIn ? t('loggedInBadge') : t('anonymousBadge')}
        </span>
      </div>

      <InsightsRow />

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={Search}
          label={t('searches')}
          value={formatCount(stats.searches, locale)}
          tone="accent"
        />
        <StatCard
          icon={Bookmark}
          label={t('shortlist')}
          value={formatCount(stats.shortlist, locale)}
        />
        <StatCard
          icon={MousePointer2}
          label={t('clicks')}
          value={formatCount(stats.clicks, locale)}
        />
        <StatCard
          icon={Sparkles}
          label={t('verdictRate')}
          value={`${verdictRate}%`}
          tone="success"
          hint={`${formatCount(stats.verdictClicks, locale)} / ${formatCount(stats.clicks, locale)}`}
        />
      </div>

      <RevenueCard />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart
          title={t('byStore')}
          emptyHint={t('emptyChart')}
          data={stats.storeBreakdown.map((s) => ({
            label: STORE_LABELS[s.store] ?? s.store,
            value: s.count,
          }))}
        />
        <DonutChart
          title={t('byTag')}
          emptyHint={t('emptyChart')}
          data={stats.tagBreakdown.map((s) => ({
            label: t(`tag.${s.tag}` as `tag.${string}`),
            value: s.count,
          }))}
        />
      </div>

      <div className="mt-4">
        <CategoryBars title={t('byCategory')} emptyHint={t('emptyChart')} />
      </div>
    </div>
  );
}
