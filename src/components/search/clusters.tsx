'use client';

import { useTranslations } from 'next-intl';
import { Tag } from 'lucide-react';
import type { Product } from '@/types/product';
import { categorize } from '@/lib/categorize';
import { storeDisplay } from '@/lib/format';

interface Props {
  query: string;
  products: Product[];
}

/**
 * Surface the dominant categories + store distribution from the result set so
 * the user can decide "do these 24 items even mean the same thing?" at a
 * glance. Pure presentational — no filter wiring yet (Phase H can promote
 * these into actual filter actions).
 *
 * Grouping prefers `merchantName` when set so a meta-search bucket like
 * "GoogleShopping" splits into the real storefronts behind it (KREAM, 11번가,
 * Walmart...).
 */
export function Clusters({ query, products }: Props) {
  const tr = useTranslations('recommend');
  const tg = useTranslations();

  const cats = categorize(query);

  // Tally storefront frequency. Key is the human-readable display label so
  // products from the same actual merchant collapse together even when they
  // came in under different StoreId buckets.
  const storeTally = new Map<string, number>();
  for (const p of products) {
    const label = storeDisplay(p);
    storeTally.set(label, (storeTally.get(label) ?? 0) + 1);
  }
  const stores = [...storeTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (cats.length === 0 && stores.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      {cats.slice(0, 3).map((c) => (
        <span
          key={'cat_' + c}
          className="inline-flex items-center gap-1 rounded-full border border-accent-200 bg-accent-50 px-2.5 py-1 text-[11.5px] font-semibold text-accent-700 dark:border-accent-800/60 dark:bg-accent-950/30 dark:text-accent-300"
        >
          <Tag className="h-3 w-3" strokeWidth={1.8} />
          {tr(`cat.${c}`)}
        </span>
      ))}
      {stores.length > 0 && (
        <span className="text-[11px] text-ink-400 dark:text-ink-500">
          {tg('distribution.acrossStores', { n: stores.length })}:
        </span>
      )}
      {stores.map(([label, n]) => (
        <span
          key={'store_' + label}
          className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink-700 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200"
        >
          {label}
          <span className="text-ink-400 dark:text-ink-500">·</span>
          <span className="text-ink-500 dark:text-ink-400">{n}</span>
        </span>
      ))}
    </div>
  );
}
