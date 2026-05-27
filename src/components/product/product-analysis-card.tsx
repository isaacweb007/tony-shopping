'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Cpu,
  Layers,
  Lightbulb,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from 'lucide-react';
import type { Product } from '@/types/product';
import { useProductAnalysis } from '@/hooks/use-product-analysis';
import { cn } from '@/lib/utils';

interface Props {
  product: Product;
  className?: string;
}

/**
 * "Tony's deep dive" — Claude-powered product depth analysis card.
 *
 * Surfaces what the raw catalog row leaves out: spec highlights, an
 * authenticity verdict with concrete signals, things to verify before
 * buying, and comparisons to alternatives. Renders four sections in
 * a single rounded card, each section anchored by an icon + tinted
 * background that matches the rest of the verdict / metrics-tiles
 * visual vocabulary (accent / sky / emerald / amber).
 *
 * Always renders something:
 *   - loading → animated skeleton lines
 *   - LLM result → 4 sections
 *   - heuristic fallback (no Claude key) → 2 minimal sections + label
 */
export function ProductAnalysisCard({ product, className }: Props) {
  const t = useTranslations('analysis');
  const { data, isLoading, isError } = useProductAnalysis(product);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-accent-300/60 bg-gradient-to-br from-accent-50/70 via-white to-sky-50/40 p-5 shadow-card dark:border-accent-700/40 dark:from-accent-950/30 dark:via-ink-900 dark:to-sky-950/20 md:p-6',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-400/30 blur-3xl"
      />

      <div className="relative flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white shadow-sm dark:bg-white dark:text-ink-900">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t('label')}
        </div>
        {data && (
          <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:border-ink-700 dark:bg-ink-900/70 dark:text-ink-400">
            {data.source === 'anthropic' ? t('engineClaude') : t('engineHeuristic')}
          </span>
        )}
      </div>

      {/* Summary */}
      {isLoading && <SkeletonLines />}
      {isError && (
        <p className="relative mt-3 text-[12.5px] text-ink-500 dark:text-ink-400">
          {t('error')}
        </p>
      )}
      {data && (
        <p className="relative mt-3 text-[14px] leading-relaxed text-ink-800 dark:text-ink-100 md:text-[15px]">
          {data.summary}
        </p>
      )}

      {/* Body — 4 sections in a 2-column grid on md+ */}
      {data && (
        <div className="relative mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {data.specs.length > 0 && (
            <Section
              icon={Cpu}
              tone="accent"
              title={t('specs')}
            >
              <ul className="space-y-1.5">
                {data.specs.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600 dark:text-accent-400"
                      strokeWidth={2.4}
                    />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {data.authenticity.signals.length > 0 && (
            <Section
              icon={data.authenticity.level === 'low' ? ShieldQuestion : ShieldCheck}
              tone={
                data.authenticity.level === 'high'
                  ? 'sky'
                  : data.authenticity.level === 'low'
                    ? 'amber'
                    : 'sky'
              }
              title={t(`authenticity.${data.authenticity.level}`)}
            >
              <ul className="space-y-1.5">
                {data.authenticity.signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400"
                      strokeWidth={2.4}
                    />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {data.buyingTips.length > 0 && (
            <Section
              icon={Lightbulb}
              tone="emerald"
              title={t('buyingTips')}
            >
              <ul className="space-y-1.5">
                {data.buyingTips.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                      strokeWidth={2.4}
                    />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {data.differentiators.length > 0 && (
            <Section
              icon={Layers}
              tone="neutral"
              title={t('differentiators')}
            >
              <ul className="space-y-1.5">
                {data.differentiators.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500 dark:text-ink-400"
                      strokeWidth={2.4}
                    />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="relative mt-3 space-y-2">
      <div className="h-3 w-11/12 animate-pulse rounded bg-ink-200/70 dark:bg-ink-700/70" />
      <div className="h-3 w-9/12 animate-pulse rounded bg-ink-200/70 dark:bg-ink-700/70" />
      <div className="h-3 w-7/12 animate-pulse rounded bg-ink-200/70 dark:bg-ink-700/70" />
    </div>
  );
}

const TONE_STYLES = {
  accent:
    'border-accent-200/80 bg-gradient-to-br from-accent-50/80 to-white dark:border-accent-800/50 dark:from-accent-950/30 dark:to-ink-900',
  sky: 'border-sky-200/80 bg-gradient-to-br from-sky-50/70 to-white dark:border-sky-800/50 dark:from-sky-950/30 dark:to-ink-900',
  emerald:
    'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white dark:border-emerald-800/50 dark:from-emerald-950/30 dark:to-ink-900',
  amber:
    'border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white dark:border-amber-800/50 dark:from-amber-950/30 dark:to-ink-900',
  neutral:
    'border-ink-200 bg-gradient-to-br from-white to-ink-50/60 dark:border-ink-700 dark:from-ink-900 dark:to-ink-800/40',
} as const;

const TONE_ICON_STYLES = {
  accent: 'text-accent-600 dark:text-accent-300',
  sky: 'text-sky-600 dark:text-sky-300',
  emerald: 'text-emerald-600 dark:text-emerald-300',
  amber: 'text-amber-600 dark:text-amber-300',
  neutral: 'text-ink-500 dark:text-ink-400',
} as const;

import type { LucideIcon } from 'lucide-react';

function Section({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE_STYLES;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl border p-3.5', TONE_STYLES[tone])}>
      <div className={cn('flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest', TONE_ICON_STYLES[tone])}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        {title}
      </div>
      <div className="mt-2 text-ink-800 dark:text-ink-100">{children}</div>
    </div>
  );
}
