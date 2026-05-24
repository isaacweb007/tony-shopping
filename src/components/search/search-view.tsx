'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/ui/share-button';
import { useSearchStore } from '@/stores/search-store';
import { useSearch } from '@/hooks/use-search';
import { ReportCard } from './report-card';
import { ProductCard } from './product-card';
import { FilterBar } from './filter-bar';
import { ProductDetailDialog } from './product-detail-dialog';
import { WarningList } from './warning-list';
import { SearchSkeleton } from './search-skeleton';
import type { Product } from '@/types/product';

export function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations('search');
  const tShare = useTranslations('share');

  const q = params.get('q') ?? '';
  const { data: result, isFetching, isError, refetch } = useSearch(q);
  const products = useSearchStore((s) => s.result?.products);
  const sort = useSearchStore((s) => s.sort);
  const store = useSearchStore((s) => s.store);

  const visible = React.useMemo<Product[]>(() => {
    if (!products) return [];
    const arr = store === 'all' ? [...products] : products.filter((p) => p.store === store);
    const sorters: Record<typeof sort, (a: Product, b: Product) => number> = {
      tony: (a, b) => b.score.total - a.score.total,
      price: (a, b) => a.finalPrice.amount - b.finalPrice.amount,
      ship: (a, b) => a.shipDays - b.shipDays,
      review: (a, b) => b.reviewCount - a.reviewCount,
      authentic: (a, b) => b.authenticityPct - a.authenticityPct,
    };
    arr.sort(sorters[sort]);
    return arr;
  }, [products, sort, store]);

  const [detail, setDetail] = React.useState<Product | null>(null);

  if (!q) {
    return (
      <div className="container max-w-3xl py-20 text-center">
        <p className="text-ink-500 dark:text-ink-400">{t('noQuery')}</p>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/')}>
          {t('back')}
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container max-w-3xl py-20 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" strokeWidth={1.6} />
        <p className="mt-4 text-ink-500 dark:text-ink-400">
          {t('noQuery')}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button variant="primary" onClick={() => router.push('/')}>
            {t('back')}
          </Button>
        </div>
      </div>
    );
  }

  if (!result || (isFetching && visible.length === 0)) {
    return <SearchSkeleton />;
  }

  const top3: Product[] = pickTop3(result.products);

  return (
    <div className="container max-w-7xl pb-32 pt-6 md:pb-20">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="pill" onClick={() => router.push('/')} className="pl-2">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          {t('back')}
        </Button>
        <ShareButton
          title={tShare('titleSearch')}
          text={q}
          url={typeof window === 'undefined' ? '' : window.location.href}
          size="sm"
          variant="outline"
        />
      </div>

      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-sm font-bold text-white dark:bg-white dark:text-ink-900">
          U
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-widest text-ink-400 dark:text-ink-500">
            {t('yourRequest')}
          </div>
          <div className="mt-0.5 break-words text-[15px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 md:text-[18px]">
            {q}
          </div>
        </div>
      </div>

      <ReportCard report={result.report} />

      <section className="mt-9">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-tighter2 md:text-[26px]">
              {t('top3')}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">{t('top3Sub')}</p>
          </div>
          <div className="hidden items-center gap-1.5 text-[11px] text-ink-500 dark:text-ink-400 md:flex">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-600" />
            {t('byScore')}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          {top3.map((p) => (
            <ProductCard key={p.id} product={p} variant="feature" onOpenDetail={setDetail} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-tighter2 md:text-[26px]">
              {t('all')}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">{t('allSub')}</p>
          </div>
        </div>
        <div className="mt-3">
          <FilterBar />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {visible.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-ink-200 py-12 text-center text-ink-500 dark:border-ink-700 dark:text-ink-400">
              {t('empty')}
            </div>
          ) : (
            visible.map((p) => (
              <ProductCard key={p.id} product={p} onOpenDetail={setDetail} />
            ))
          )}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-[20px] font-extrabold tracking-tighter2 md:text-[26px]">
          {t('alt')}
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">{t('altSub')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[...result.products]
            .sort((a, b) => a.finalPrice.amount - b.finalPrice.amount)
            .slice(2, 6)
            .map((p) => (
              <ProductCard key={p.id} product={p} onOpenDetail={setDetail} />
            ))}
        </div>
      </section>

      <WarningList />

      <ProductDetailDialog
        product={detail}
        onOpenChange={(open) => !open && setDetail(null)}
      />
    </div>
  );
}

function pickTop3(arr: Product[]): Product[] {
  const best = [...arr].sort((a, b) => b.score.total - a.score.total)[0];
  if (!best) return [];
  const cheap = [...arr]
    .filter((p) => p.id !== best.id)
    .sort((a, b) => a.finalPrice.amount - b.finalPrice.amount)[0];
  if (!cheap) return [best];
  const fast = [...arr]
    .filter((p) => p.id !== best.id && p.id !== cheap.id)
    .sort((a, b) => a.shipDays - b.shipDays)[0];
  return fast ? [best, cheap, fast] : [best, cheap];
}

