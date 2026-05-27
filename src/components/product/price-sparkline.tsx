'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { formatMoneyLocale } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PriceSnapshot } from '@/stores/price-watch-store';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  snapshot: PriceSnapshot | null;
  /** Drawn dimensions; default works inside the product detail card. */
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Vector-only sparkline of a product's recent price observations. Renders
 * nothing until there are ≥ 2 entries — a single point doesn't tell a story.
 *
 * The line is drawn in viewBox coords (0..width × 0..height), with
 * `preserveAspectRatio="none"` so it stretches to whatever container we drop
 * it into. The latest point gets a dot; the y-axis labels float at min/max.
 */
export function PriceSparkline({ snapshot, width = 320, height = 80, className }: Props) {
  const t = useTranslations('product.history');
  const locale = useLocale() as AppLocale;
  // Stable id for the SVG <linearGradient> — must run on every render
  // so it can't sit below the early-return below.
  const fillId = React.useId();

  const series = snapshot?.entries ?? [];
  const n = series.length;

  if (!snapshot || n < 2) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-ink-200 bg-ink-50/30 p-4 text-[12.5px] text-ink-500 dark:border-ink-700 dark:bg-ink-800/30 dark:text-ink-400',
          className,
        )}
      >
        <div className="font-bold text-ink-700 dark:text-ink-200">{t('title')}</div>
        <p className="mt-1">{t('empty')}</p>
      </div>
    );
  }

  const amounts = series.map((e) => e.amount);
  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);
  const range = Math.max(1, maxAmount - minAmount);

  // Project each entry to viewBox space.
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const points = series.map((e, i) => {
    const x = pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = pad + innerH - ((e.amount - minAmount) / range) * innerH;
    return { x, y };
  });
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

  // Latest delta for the headline.
  const firstAmount = amounts[0]!;
  const lastAmount = amounts[n - 1]!;
  const delta = (lastAmount - firstAmount) / firstAmount;
  const isDown = delta < 0;
  const isFlat = Math.abs(delta) < 0.005;
  const Arrow = isFlat ? Minus : isDown ? TrendingDown : TrendingUp;
  const deltaTone = isFlat
    ? 'text-ink-500 dark:text-ink-400'
    : isDown
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';
  const strokeClass = isFlat
    ? 'stroke-ink-400 dark:stroke-ink-500'
    : isDown
      ? 'stroke-emerald-500 dark:stroke-emerald-400'
      : 'stroke-red-500 dark:stroke-red-400';

  const minMoney = formatMoneyLocale({ amount: minAmount, currency: snapshot.currency }, locale);
  const maxMoney = formatMoneyLocale({ amount: maxAmount, currency: snapshot.currency }, locale);
  const pct = Math.abs(delta * 100).toFixed(1);
  const last = points[n - 1]!;

  // Background gradient direction reflects the price trajectory — emerald
  // wash when prices have dropped (good for the buyer), red wash when
  // rising. Keeps the visual story aligned with the delta number above.
  const containerTone = isFlat
    ? 'border-ink-200 bg-gradient-to-br from-white via-white to-ink-50/60 dark:border-ink-800 dark:from-ink-900 dark:via-ink-900 dark:to-ink-800/40'
    : isDown
      ? 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/20 dark:border-emerald-800/50 dark:from-emerald-950/20 dark:via-ink-900 dark:to-emerald-950/10'
      : 'border-red-200/70 bg-gradient-to-br from-red-50/60 via-white to-red-50/20 dark:border-red-800/50 dark:from-red-950/20 dark:via-ink-900 dark:to-red-950/10';

  // Build an area path that closes back to the baseline so we can fill
  // underneath the line with a soft tone-matched gradient.
  const areaPath = `${d} L ${last.x.toFixed(2)} ${(pad + innerH).toFixed(2)} L ${points[0]!.x.toFixed(2)} ${(pad + innerH).toFixed(2)} Z`;
  // Tone-matched gradient color for the area fill — emerald wash on a
  // price drop, red wash on a rise, neutral grey when flat.
  const fillTopColor = isFlat
    ? 'rgba(148, 163, 184, 0.25)'
    : isDown
      ? 'rgba(16, 185, 129, 0.30)'
      : 'rgba(239, 68, 68, 0.25)';
  const fillBottomColor = isFlat
    ? 'rgba(148, 163, 184, 0)'
    : isDown
      ? 'rgba(16, 185, 129, 0)'
      : 'rgba(239, 68, 68, 0)';

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border p-4 shadow-sm', containerTone, className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          {t('title')}
        </div>
        <div className={cn('inline-flex items-center gap-1 text-[12.5px] font-bold tabular-nums', deltaTone)}>
          <Arrow className="h-3.5 w-3.5" strokeWidth={2.2} />
          {isFlat ? t('flat') : `${pct}%`}
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3 text-[10px] uppercase tracking-widest text-ink-400 dark:text-ink-500">
        <span>
          {t('low')} <span className="font-bold text-ink-700 dark:text-ink-200">{minMoney}</span>
        </span>
        <span>
          {t('high')} <span className="font-bold text-ink-700 dark:text-ink-200">{maxMoney}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="mt-2 h-20 w-full"
        aria-label={t('a11y', { n })}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillTopColor} />
            <stop offset="100%" stopColor={fillBottomColor} />
          </linearGradient>
        </defs>
        {/* Faint baseline */}
        <line
          x1={pad}
          y1={pad + innerH}
          x2={pad + innerW}
          y2={pad + innerH}
          className="stroke-ink-100 dark:stroke-ink-800"
          strokeWidth={1}
        />
        {/* Filled area below the line */}
        <path d={areaPath} fill={`url(#${fillId})`} />
        <path
          d={d}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={strokeClass}
        />
        <circle cx={last.x} cy={last.y} r={3} className={strokeClass} fill="currentColor" />
      </svg>
      <p className="mt-2 text-[11px] text-ink-500 dark:text-ink-400">{t('caption', { n })}</p>
    </div>
  );
}
