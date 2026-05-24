'use client';

import { useTranslations } from 'next-intl';
import { Bot, MessageSquareQuote, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Product } from '@/types/product';
import { useReviewAnalysis } from '@/hooks/use-review-analysis';
import { cn } from '@/lib/utils';

interface Props {
  product: Product;
}

/**
 * Tony's review analysis card.
 *
 * Renders inside the product detail dialog and on the /product/[id] page.
 * Always renders something — when the product carries no review samples the
 * component returns null silently so it doesn't pad the layout.
 */
export function ReviewAnalysis({ product }: Props) {
  const t = useTranslations('review');
  const sampleCount = product.reviewSamples?.length ?? 0;
  const { data, isLoading, isError } = useReviewAnalysis(product);

  if (sampleCount === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-bold tracking-tight">
          <MessageSquareQuote className="h-4 w-4 text-accent-600 dark:text-accent-400" strokeWidth={1.8} />
          {t('label')}
        </div>
        {data && (
          <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-400">
            {data.source === 'heuristic' ? t('engineHeuristic') : t('engineLlm')}
          </span>
        )}
      </div>

      {isLoading && (
        <p className="mt-3 text-[12.5px] text-ink-500 dark:text-ink-400">{t('loading')}</p>
      )}

      {isError && (
        <p className="mt-3 text-[12.5px] text-ink-500 dark:text-ink-400">{t('loading')}</p>
      )}

      {data && (
        <>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-800 dark:text-ink-100">
            {data.summary}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.positives.length > 0 && (
              <PointList
                icon={<ThumbsUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />}
                title={t('good')}
                items={data.positives}
                tone="good"
              />
            )}
            {data.negatives.length > 0 && (
              <PointList
                icon={<ThumbsDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" strokeWidth={2} />}
                title={t('bad')}
                items={data.negatives}
                tone="bad"
              />
            )}
          </div>

          <AuthenticityBar score={data.authenticityScore} t={t} />

          <p className="mt-2 text-[11px] text-ink-400 dark:text-ink-500">
            {t('byTony', { n: sampleCount })}
          </p>
        </>
      )}
    </div>
  );
}

function PointList({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: 'good' | 'bad';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        tone === 'good'
          ? 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20'
          : 'border-amber-200/70 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-600 dark:text-ink-300">
        {icon}
        {title}
      </div>
      <ul className="mt-1.5 space-y-1 text-[12.5px] text-ink-800 dark:text-ink-100">
        {items.map((s, i) => (
          <li key={i}>· {s}</li>
        ))}
      </ul>
    </div>
  );
}

function AuthenticityBar({
  score,
  t,
}: {
  score: number;
  t: (key: string) => string;
}) {
  const tone =
    score >= 75
      ? { color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: t('authenticityHigh') }
      : score >= 50
        ? { color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: t('authenticityMid') }
        : { color: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: t('authenticityLow') };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          {score < 60 ? (
            <Bot className="h-3.5 w-3.5" strokeWidth={1.8} />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          {t('authenticityBar')}
        </span>
        <span className={cn('font-bold', tone.text)}>{score}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
        <div className={cn('h-full transition-[width] duration-700', tone.color)} style={{ width: `${score}%` }} />
      </div>
      <div className={cn('mt-1 text-[11px]', tone.text)}>{tone.label}</div>
    </div>
  );
}
