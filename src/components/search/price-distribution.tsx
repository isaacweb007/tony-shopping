'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Product } from '@/types/product';
import { formatMoney } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  products: Product[];
  /** Highlight this product in the distribution (e.g. Tony's pick). */
  highlight?: Product | null;
}

/**
 * Tiny SVG-based price histogram.
 *
 * Reason it exists: shows the user where the recommended price sits relative
 * to the rest of the market in one glance — a "is this a good price?" check
 * that complements the Tony Score. No external chart lib required.
 */
export function PriceDistribution({ products, highlight }: Props) {
  const t = useTranslations('distribution');
  const locale = useLocale() as AppLocale;

  // Defensive: nothing to draw without prices in a single currency.
  if (products.length === 0) return null;
  const currency = products[0]!.finalPrice.currency;
  const prices = products
    .map((p) => p.finalPrice)
    .filter((m) => m.currency === currency)
    .map((m) => m.amount)
    .filter((n) => n > 0);

  if (prices.length < 3) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1, max - min);

  // 10 buckets, but never more than half the sample to avoid sparse bars.
  const bucketCount = Math.min(10, Math.max(4, Math.floor(prices.length / 2)));
  const bucketWidth = span / bucketCount;
  const buckets = new Array(bucketCount).fill(0) as number[];
  for (const p of prices) {
    const idx = Math.min(bucketCount - 1, Math.floor((p - min) / bucketWidth));
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  const peak = Math.max(...buckets);

  const highlightAmt =
    highlight && highlight.finalPrice.currency === currency ? highlight.finalPrice.amount : null;
  const highlightIdx =
    highlightAmt !== null
      ? Math.min(bucketCount - 1, Math.floor((highlightAmt - min) / bucketWidth))
      : null;

  const W = 100; // viewBox width
  const H = 36;
  const gap = 2;
  const barW = (W - gap * (bucketCount - 1)) / bucketCount;

  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)] ?? avg;

  return (
    <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
            {t('label')}
          </div>
          <p className="mt-0.5 text-[13px] text-ink-600 dark:text-ink-300">
            {t('subtitle', {
              min: formatMoney({ amount: min, currency }, locale),
              max: formatMoney({ amount: max, currency }, locale),
            })}
          </p>
        </div>
        <div className="text-right text-[11px] text-ink-500 dark:text-ink-400">
          <div>
            {t('median')} <b className="text-ink-800 dark:text-ink-100">{formatMoney({ amount: median, currency }, locale)}</b>
          </div>
          <div>
            {t('avg')} <b className="text-ink-800 dark:text-ink-100">{formatMoney({ amount: avg, currency }, locale)}</b>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H + 8}`} className="mt-3 w-full" role="img" aria-label={t('label')}>
        {buckets.map((count, i) => {
          const h = peak > 0 ? (count / peak) * H : 0;
          const x = i * (barW + gap);
          const y = H - h;
          const isHighlight = i === highlightIdx;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(0.5, h)}
              rx={0.6}
              className={
                isHighlight
                  ? 'fill-accent-600 dark:fill-accent-400'
                  : 'fill-ink-200 dark:fill-ink-700'
              }
            />
          );
        })}
        {/* baseline */}
        <line x1={0} x2={W} y1={H} y2={H} className="stroke-ink-300 dark:stroke-ink-700" strokeWidth={0.4} />
      </svg>

      {highlightAmt !== null && (
        <div className="mt-2 flex items-center gap-1.5 text-[12px]">
          <span className="inline-block h-2 w-2 rounded-sm bg-accent-600 dark:bg-accent-400" />
          <span className="text-ink-600 dark:text-ink-300">
            {t('pickHere', { price: formatMoney({ amount: highlightAmt, currency }, locale) })}
          </span>
        </div>
      )}
    </div>
  );
}
