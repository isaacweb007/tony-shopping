'use client';

import { useTranslations } from 'next-intl';
import type { TonyScore } from '@/types/product';
import { cn } from '@/lib/utils';

interface Props {
  score: TonyScore;
  className?: string;
}

/**
 * Tony Score breakdown — turns the single 0-100 number into its four
 * weighted components so the recommendation isn't a black box. Trust
 * comes from being able to audit *why* Tony picked this.
 *
 *   상품 유사도 · 가격 경쟁력 · 리뷰 신뢰도 · 정품 가능성
 *
 * Each axis renders a labelled mini-bar. Tone-coded per axis to match the
 * rest of the design vocabulary (accent / emerald / amber / sky).
 */
const AXES: Array<{
  key: keyof Omit<TonyScore, 'total'>;
  labelKey: 'kSim' | 'kPrice' | 'kReview' | 'kAuth';
  bar: string;
}> = [
  { key: 'similarity', labelKey: 'kSim', bar: 'bg-accent-500' },
  { key: 'priceEdge', labelKey: 'kPrice', bar: 'bg-emerald-500' },
  { key: 'reviewTrust', labelKey: 'kReview', bar: 'bg-amber-500' },
  { key: 'authenticity', labelKey: 'kAuth', bar: 'bg-sky-500' },
];

export function TonyScoreBreakdown({ score, className }: Props) {
  const td = useTranslations('detail');

  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
      {AXES.map((a) => {
        const val = Math.max(0, Math.min(100, score[a.key]));
        return (
          <div key={a.key}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-ink-600 dark:text-ink-300">
                {td(a.labelKey)}
              </span>
              <span className="font-bold tabular-nums text-ink-800 dark:text-ink-100">
                {val}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', a.bar)}
                style={{ width: `${val}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
