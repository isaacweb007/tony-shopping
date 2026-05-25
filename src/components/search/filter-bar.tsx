'use client';

import { useTranslations } from 'next-intl';
import { useSearchStore } from '@/stores/search-store';
import type { SortKey, StoreFilter } from '@/types/search';
import { cn } from '@/lib/utils';

const SORT_KEYS: SortKey[] = ['tony', 'price', 'ship', 'review', 'authentic'];
const STORE_KEYS: StoreFilter[] = [
  'all',
  'Coupang',
  'NaverShopping',
  'Amazon',
  'eBay',
  'Shopee',
  'Lazada',
  'Rakuten',
  'YahooJP',
  'AliExpress',
  'GoogleShopping',
];

const STORE_LABEL: Record<StoreFilter, string> = {
  all: '',
  Coupang: 'Coupang',
  Amazon: 'Amazon',
  eBay: 'eBay',
  Shopee: 'Shopee',
  Lazada: 'Lazada',
  NaverShopping: '네이버쇼핑',
  AliExpress: 'AliExpress',
  Gmarket: 'Gmarket',
  '11st': '11번가',
  TikTokShop: 'TikTok Shop',
  GoogleShopping: 'Google Shopping',
  Rakuten: '楽天',
  YahooJP: 'Yahoo! JP',
};

export function FilterBar() {
  const t = useTranslations('sort');
  const ts = useTranslations('store');
  const sort = useSearchStore((s) => s.sort);
  const store = useSearchStore((s) => s.store);
  const setSort = useSearchStore((s) => s.setSort);
  const setStore = useSearchStore((s) => s.setStore);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {SORT_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setSort(k)}
            className={cn(
              'rounded-full border px-3.5 py-2 text-[13px] font-semibold transition',
              sort === k
                ? 'border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-ink-900'
                : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800',
            )}
          >
            {t(k)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {STORE_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setStore(k)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[12px] font-medium transition',
              store === k
                ? 'border-accent-300 bg-accent-100 text-accent-700 dark:border-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800',
            )}
          >
            {k === 'all' ? ts('all') : STORE_LABEL[k]}
          </button>
        ))}
      </div>
    </>
  );
}
