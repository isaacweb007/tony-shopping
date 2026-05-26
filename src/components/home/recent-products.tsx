'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useRecentProductsStore } from '@/stores/recent-products-store';
import { formatMoneyLocale } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

/**
 * Home-page row that paints the last 8 product detail visits as a
 * horizontal scroll. Hidden when the user has fewer than 2 entries —
 * a single thumb on its own is more lonely than useful.
 *
 * Each card links back to /product/[id]?q={originalQuery} so Tony can
 * re-run the search and rehydrate the full product view.
 */
export function RecentProducts() {
  const t = useTranslations('home.recent');
  const locale = useLocale() as AppLocale;
  const items = useRecentProductsStore((s) => s.items);
  const clear = useRecentProductsStore((s) => s.clear);

  // Hydration guard — persisted state isn't available server-side.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted || items.length < 2) return null;

  return (
    <section className="container max-w-6xl pb-2 pt-6 md:pb-4 md:pt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
            <Clock className="h-3 w-3" strokeWidth={2.4} />
            {t('title')}
          </div>
          <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">{t('subtitle')}</p>
        </div>
        <button
          onClick={clear}
          className="text-[11.5px] font-semibold text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline dark:text-ink-400 dark:hover:text-ink-100"
        >
          {t('clear')}
        </button>
      </div>
      <ul
        className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        // The mask keeps the right edge feeling open rather than chopped.
        // No JS — pure CSS scroll-snap so back/forward keeps state.
      >
        {items.map((it) => (
          <li key={it.id} className="shrink-0 snap-start">
            <Link
              href={`/product/${it.id}?q=${encodeURIComponent(it.query)}`}
              className="group flex w-[148px] flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-2 transition hover:border-accent-300 hover:bg-accent-50/30 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent-700 dark:hover:bg-accent-950/20"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-ink-50 dark:bg-ink-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.imageUrl || '/icon.svg'}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[10.5px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                  {it.store}
                </div>
                <div className="line-clamp-2 text-[12.5px] font-semibold leading-tight tracking-tight">
                  {it.name}
                </div>
                <div className="mt-1 text-[12px] font-bold text-accent-700 dark:text-accent-300">
                  {formatMoneyLocale(it.finalPrice, locale)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
