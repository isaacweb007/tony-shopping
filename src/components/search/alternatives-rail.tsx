'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles, Swords, History, PiggyBank, Crown } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import type { Product } from '@/types/product';
import { useProductAlternatives } from '@/hooks/use-product-alternatives';
import type { AlternativeAngle } from '@/lib/product-alternatives';
import { cn } from '@/lib/utils';

interface Props {
  /** Canonical product whose alternatives Tony should suggest. */
  product: Product;
  className?: string;
}

const ANGLE_META: Record<
  AlternativeAngle,
  {
    icon: typeof Swords;
    tone: 'accent' | 'amber' | 'emerald' | 'sky';
  }
> = {
  competitor: { icon: Swords, tone: 'accent' },
  prior_gen: { icon: History, tone: 'amber' },
  budget: { icon: PiggyBank, tone: 'emerald' },
  premium: { icon: Crown, tone: 'sky' },
};

const TONE_PILL: Record<'accent' | 'amber' | 'emerald' | 'sky', string> = {
  accent:
    'border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-800/60 dark:bg-accent-950/40 dark:text-accent-300',
  amber:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300',
  emerald:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  sky:
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300',
};

const TONE_CARD: Record<'accent' | 'amber' | 'emerald' | 'sky', string> = {
  accent: 'border-accent-200/70 hover:border-accent-400 dark:border-accent-800/40 dark:hover:border-accent-600',
  amber: 'border-amber-200/70 hover:border-amber-400 dark:border-amber-800/40 dark:hover:border-amber-600',
  emerald: 'border-emerald-200/70 hover:border-emerald-400 dark:border-emerald-800/40 dark:hover:border-emerald-600',
  sky: 'border-sky-200/70 hover:border-sky-400 dark:border-sky-800/40 dark:hover:border-sky-600',
};

/**
 * "Tony도 같이 고려해봤어요" — alternative product suggestions rail.
 *
 * Sits below the verdict card and gives the user "what else should I
 * consider" prompts — the move that turns a search engine into a
 * shopping agent. Each alternative is a clickable card that, when
 * tapped, launches a fresh /search for that alternative name so the
 * user can immediately see what Tony thinks of the alternative too.
 *
 * Visual language: horizontal scroll on mobile, 3-up grid on md+.
 * Each card uses an angle-coded tone (competitor=accent, prior_gen
 * =amber, budget=emerald, premium=sky) so the user reads the type of
 * suggestion at a glance.
 *
 * Renders nothing on loading-or-empty so the rail doesn't appear and
 * disappear mid-render.
 */
export function AlternativesRail({ product, className }: Props) {
  const t = useTranslations('alternatives');
  const router = useRouter();
  const { data, isLoading } = useProductAlternatives(product);

  if (isLoading) {
    return (
      <section className={cn('mt-6', className)} aria-label={t('aria')}>
        <SkeletonHeader />
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  if (!data || data.alternatives.length === 0) {
    return null;
  }

  function openSearch(name: string) {
    router.push(`/search?q=${encodeURIComponent(name)}`);
  }

  return (
    <section className={cn('mt-6', className)} aria-label={t('aria')}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[10.5px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
            {t('label')}
          </div>
          <h3 className="mt-2 text-[16px] font-extrabold tracking-tighter2 md:text-[18px]">
            {t('headline')}
          </h3>
        </div>
        <span className="hidden text-[11px] text-ink-500 dark:text-ink-400 md:inline">
          {t('subtle')}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {data.alternatives.slice(0, 3).map((alt, i) => {
          const meta = ANGLE_META[alt.angle];
          const Icon = meta.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => openSearch(alt.name)}
              className={cn(
                'group/alt flex flex-col items-stretch rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-card dark:bg-ink-900',
                TONE_CARD[meta.tone],
              )}
            >
              <span
                className={cn(
                  'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                  TONE_PILL[meta.tone],
                )}
              >
                <Icon className="h-3 w-3" strokeWidth={2.4} />
                {t(`angle.${alt.angle}`)}
              </span>
              <div className="mt-2.5 line-clamp-2 text-[14px] font-bold leading-snug tracking-tight text-ink-900 dark:text-ink-50">
                {alt.name}
              </div>
              <p className="mt-1.5 line-clamp-3 flex-1 text-[12.5px] leading-snug text-ink-600 dark:text-ink-300">
                {alt.reason}
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-accent-700 transition-transform group-hover/alt:translate-x-0.5 dark:text-accent-300">
                {t('cta')}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SkeletonHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="h-5 w-32 animate-pulse rounded-full bg-ink-100 dark:bg-ink-800" />
        <div className="mt-2 h-5 w-48 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-32 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
  );
}
