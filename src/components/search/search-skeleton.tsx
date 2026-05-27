'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Search, Sparkles, Store, type LucideIcon } from 'lucide-react';

/**
 * SearchSkeleton — premium loading state shown while Tony is fanning out
 * to adapters, fetching reviews and asking the LLM for a verdict.
 *
 * The classic skeleton placeholders feel passive. We replace the top hero
 * placeholder with a live "Tony is working" banner that rotates through
 * concrete stages every ~700 ms:
 *   "쇼핑몰 검색 중..." → "리뷰 분석 중..." → "가격 비교 중..." → "결정 중..."
 *
 * This projects competence (work is happening), gives the user something
 * to read instead of waiting blankly, and matches the gradient/glow
 * vocabulary of the verdict card that's about to replace it.
 */
const STAGE_KEYS = ['scan', 'reviews', 'price', 'decide'] as const;
type Stage = (typeof STAGE_KEYS)[number];

const STAGE_ICONS: Record<Stage, LucideIcon> = {
  scan: Store,
  reviews: Search,
  price: Sparkles,
  decide: Brain,
};

export function SearchSkeleton() {
  const t = useTranslations('searchLoading');
  const [stageIdx, setStageIdx] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setStageIdx((i) => (i + 1) % STAGE_KEYS.length);
    }, 700);
    return () => clearInterval(id);
  }, []);

  const stage = STAGE_KEYS[stageIdx]!;
  const StageIcon = STAGE_ICONS[stage];

  return (
    <div className="container max-w-7xl pb-32 pt-6 md:pb-20">
      <div className="h-9 w-24 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800" />

      <div className="mt-4 flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-800" />
        <div className="w-full max-w-md space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
        </div>
      </div>

      {/* Tony-is-working hero — matches the verdict card's gradient vocabulary
          so the swap when results land feels continuous. */}
      <div className="relative mt-6 overflow-hidden rounded-3xl border border-accent-300/60 bg-gradient-to-br from-accent-50/70 via-white to-sky-50/40 shadow-card dark:border-accent-700/40 dark:from-accent-950/30 dark:via-ink-900 dark:to-sky-950/20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 animate-pulse rounded-full bg-accent-400/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 animate-pulse rounded-full bg-sky-400/20 blur-3xl"
          style={{ animationDelay: '350ms' }}
        />

        <div className="relative p-5 md:p-7">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-[11px] font-bold tracking-wider text-white shadow-sm dark:bg-white dark:text-ink-900">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            {t('label')}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700 shadow-sm dark:bg-accent-950/60 dark:text-accent-300">
              <StageIcon className="h-4 w-4" strokeWidth={2.2} />
              <span className="absolute inset-0 animate-ping rounded-xl bg-accent-400/40 dark:bg-accent-500/30" />
            </span>
            <div className="min-w-0 flex-1">
              <div
                key={stage}
                className="animate-fade-up text-[15px] font-bold leading-tight tracking-tight text-ink-900 dark:text-ink-50 md:text-[17px]"
              >
                {t(`stage.${stage}`)}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500">
                {t('subtle')}
              </div>
            </div>
          </div>

          {/* Stage progress dots */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {STAGE_KEYS.map((s, i) => (
              <span
                key={s}
                className={
                  'h-1.5 rounded-full transition-all duration-500 ' +
                  (i === stageIdx
                    ? 'w-8 bg-accent-500 dark:bg-accent-400'
                    : i < stageIdx
                      ? 'w-3 bg-accent-300 dark:bg-accent-700'
                      : 'w-3 bg-ink-200 dark:bg-ink-700')
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-9 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-3xl bg-ink-100 dark:bg-ink-800" />
        ))}
      </div>
      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
        ))}
      </div>
    </div>
  );
}
