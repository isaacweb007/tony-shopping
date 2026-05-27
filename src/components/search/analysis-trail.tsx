'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Brain,
  CheckCircle2,
  Layers,
  MessageSquareText,
  Store,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Product, TonyReport } from '@/types/product';
import { storeDisplay } from '@/lib/format';
import { formatCount } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  products: Product[];
  report: TonyReport;
}

/**
 * AnalysisTrail — the "receipts" row directly under the VerdictCard.
 *
 * Purpose: project competence. The user just hit one button; Tony did a lot of
 * work behind the scenes (10+ stores scanned, dozens of items compared,
 * thousands of reviews aggregated). Surfacing those counts in a compact stat
 * strip reframes the verdict from "an opinion" to "a decision backed by
 * homework", which is what makes a recommendation feel strong instead of
 * pushy.
 *
 * Pure presentational — no fetching. Numbers are derived from the already-
 * loaded SearchResult and the precomputed TonyReport.
 */
export function AnalysisTrail({ products, report }: Props) {
  const t = useTranslations('analysisTrail');
  const locale = useLocale() as AppLocale;

  // Distinct storefronts in the result set. Uses the storeDisplay() helper
  // so that meta-search merchants (KREAM, 쿠팡, Apple...) collapse the way
  // a human would group them.
  const merchantCount = React.useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) seen.add(storeDisplay(p));
    return seen.size;
  }, [products]);

  const totalReviews = React.useMemo(
    () => products.reduce((sum, p) => sum + (p.reviewCount ?? 0), 0),
    [products],
  );

  const stats: Array<{
    icon: LucideIcon;
    value: string;
    label: string;
  }> = [
    {
      icon: Store,
      value: String(merchantCount),
      label: t('merchants'),
    },
    {
      icon: Layers,
      value: String(products.length),
      label: t('products'),
    },
    {
      icon: MessageSquareText,
      value: formatCount(totalReviews, locale),
      label: t('reviews'),
    },
    {
      icon: Brain,
      value: t('aiInline'),
      label: t('decided'),
    },
  ];

  return (
    <div
      className="mt-4 rounded-2xl border border-ink-200/70 bg-gradient-to-br from-white via-white to-accent-50/30 p-3 shadow-sm dark:border-ink-800/70 dark:from-ink-900 dark:via-ink-900 dark:to-accent-950/20 md:p-4"
      role="region"
      aria-label={t('aria')}
    >
      <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
        <Zap className="h-3 w-3" strokeWidth={2.6} />
        {t('headline')}
        <span className="text-ink-300 dark:text-ink-600">·</span>
        <span className="text-ink-500 dark:text-ink-400">
          {t('highSim', { n: report.highlySimilar })}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2 dark:border-ink-800 dark:bg-ink-950"
            >
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400"
                strokeWidth={2.4}
              />
              <Icon
                className="h-4 w-4 shrink-0 text-ink-400 dark:text-ink-500"
                strokeWidth={1.8}
              />
              <div className="min-w-0">
                <div className="text-[14px] font-extrabold tabular-nums tracking-tight text-ink-900 dark:text-ink-50">
                  {s.value}
                </div>
                <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500">
                  {s.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
