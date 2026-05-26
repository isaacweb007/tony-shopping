'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { PriceBucket } from '@/lib/price-buckets';

interface Props {
  selected: PriceBucket | null;
  onSelect: (next: PriceBucket | null) => void;
  /** Hide entirely when the upstream couldn't compute thresholds. */
  visible: boolean;
}

/**
 * Quantile-based price-range facet for /search. Three buckets — low,
 * mid, high — derived from the visible product set's 33rd / 67th
 * percentile prices (see lib/price-buckets.ts). All buckets visible
 * at once so the user can flip between them without re-opening a
 * menu; behaves like a radiogroup with an explicit "All" reset.
 */
export function PriceBucketChips({ selected, onSelect, visible }: Props) {
  const t = useTranslations('search.priceBuckets');
  if (!visible) return null;

  const items: Array<{ key: PriceBucket | null; label: string }> = [
    { key: null, label: t('all') },
    { key: 'low', label: t('low') },
    { key: 'mid', label: t('mid') },
    { key: 'high', label: t('high') },
  ];

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-1.5"
      role="radiogroup"
      aria-label={t('label')}
    >
      <span className="mr-1 text-[10.5px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {t('label')}
      </span>
      {items.map((it) => {
        const active = selected === it.key;
        return (
          <button
            key={String(it.key)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(it.key)}
            className={cn(
              'inline-flex h-7 items-center rounded-full border px-2.5 text-[11.5px] font-bold tracking-tight transition',
              active
                ? 'border-accent-500 bg-accent-600 text-white dark:border-accent-400 dark:bg-accent-500'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-600',
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
