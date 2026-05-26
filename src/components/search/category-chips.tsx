'use client';

import { useTranslations } from 'next-intl';
import { Tag } from 'lucide-react';
import { categorize, type Category } from '@/lib/categorize';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

interface Props {
  products: readonly Product[];
  selected: Category | null;
  onSelect: (next: Category | null) => void;
}

export interface CategoryBucket {
  category: Category;
  count: number;
}

/**
 * Tally products into categories by running categorize() on each product
 * name. A product can match multiple categories (e.g. "kids' running shoe"
 * → shoes + baby + sports); each match counts. Buckets are sorted by count
 * desc, capped at 6, and only shown when at least 2 distinct categories
 * survived (otherwise the chip row would be useless).
 */
export function bucketProducts(products: readonly Product[]): CategoryBucket[] {
  const counts = new Map<Category, number>();
  for (const p of products) {
    const cats = categorize(p.name);
    for (const c of cats) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const buckets = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  return buckets;
}

export function CategoryChips({ products, selected, onSelect }: Props) {
  const t = useTranslations('search.categories');
  const buckets = bucketProducts(products);
  // Hide the row when there's no signal — a flat result set doesn't need a facet.
  if (buckets.length < 2) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('aria')}>
      <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        <Tag className="h-3 w-3" strokeWidth={2.4} />
        {t('label')}
      </span>
      <button
        type="button"
        role="radio"
        aria-checked={selected === null}
        onClick={() => onSelect(null)}
        className={cn(
          'h-7 rounded-full border px-2.5 text-[11.5px] font-bold tracking-tight transition',
          selected === null
            ? 'border-accent-500 bg-accent-600 text-white dark:border-accent-400 dark:bg-accent-500'
            : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200',
        )}
      >
        {t('all', { n: products.length })}
      </button>
      {buckets.map(({ category, count }) => {
        const active = selected === category;
        return (
          <button
            key={category}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(active ? null : category)}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px] font-bold tracking-tight transition',
              active
                ? 'border-accent-500 bg-accent-600 text-white dark:border-accent-400 dark:bg-accent-500'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200',
            )}
          >
            {t(`names.${category}` as 'names.shoes')}
            <span
              className={cn(
                'rounded px-1 text-[10px] font-bold',
                active ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
