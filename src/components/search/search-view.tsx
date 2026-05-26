'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, AlertCircle, Search } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/ui/share-button';
import { useSearchStore } from '@/stores/search-store';
import { useHistoryStore } from '@/stores/history-store';
import { useSearch } from '@/hooks/use-search';
import { ReportCard } from './report-card';
import { VerdictCard } from './verdict-card';
import { PriceDistribution } from './price-distribution';
import { Clusters } from './clusters';
import { ProductCard } from './product-card';
import { StickyFilterBar } from './sticky-filter-bar';
import { ResultsBadge } from './results-badge';
import { MockStoresNote } from './mock-stores-note';
import { CategoryChips } from './category-chips';
import { categorize, type Category } from '@/lib/categorize';
import { computePriceBuckets, bucketOf, type PriceBucket } from '@/lib/price-buckets';
import { PriceBucketChips } from './price-bucket-chips';
import { ProductDetailDialog } from './product-detail-dialog';
import { FloatingCompareBar } from '@/components/product/floating-compare-bar';
import { WarningList } from './warning-list';
import { SearchSkeleton } from './search-skeleton';
import { useGridKeyboardNav } from '@/hooks/use-grid-keyboard-nav';
import { useProgressiveList } from '@/hooks/use-progressive-list';
import type { Product } from '@/types/product';

export function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations('search');
  const tShare = useTranslations('share');

  const q = params.get('q') ?? '';
  const storeParam = params.get('store');
  const sortParam = params.get('sort');
  const { data: result, isFetching, isError, refetch } = useSearch(q);
  const products = useSearchStore((s) => s.result?.products);
  const sort = useSearchStore((s) => s.sort);
  const store = useSearchStore((s) => s.store);
  const setStore = useSearchStore((s) => s.setStore);
  const setSort = useSearchStore((s) => s.setSort);

  // Deep-link filters via /search?q=…&store=Coupang&sort=price. We sync
  // once per (q, param) change so manual FilterBar picks after first
  // hydration stick. Both store + sort apply the same rule.
  React.useEffect(() => {
    if (storeParam && storeParam !== store) {
      setStore(storeParam as typeof store);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeParam, q]);
  React.useEffect(() => {
    if (sortParam && sortParam !== sort) {
      setSort(sortParam as typeof sort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortParam, q]);

  // "," / "." cycles through the sort order (tony → price → ship → review
  // → authentic, wrapping). Modeled after the keyboard-nav rule of not
  // hijacking typing — we no-op when focus is inside an editable element.
  React.useEffect(() => {
    const SORT_CYCLE: ReadonlyArray<typeof sort> = ['tony', 'price', 'ship', 'review', 'authentic'];
    function inEditable(el: EventTarget | null) {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== ',' && e.key !== '.') return;
      if (inEditable(e.target)) return;
      const i = SORT_CYCLE.indexOf(sort);
      if (i < 0) return;
      const next =
        e.key === '.'
          ? SORT_CYCLE[(i + 1) % SORT_CYCLE.length]!
          : SORT_CYCLE[(i - 1 + SORT_CYCLE.length) % SORT_CYCLE.length]!;
      e.preventDefault();
      setSort(next);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sort, setSort]);

  // Share URL bakes in the current filter state so anyone who opens
  // the link sees the same product set + ordering. We omit the
  // defaults ('all' / 'tony') to keep the URL tidy.
  const shareUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const u = new URL(window.location.href);
    if (store !== 'all') u.searchParams.set('store', store);
    else u.searchParams.delete('store');
    if (sort !== 'tony') u.searchParams.set('sort', sort);
    else u.searchParams.delete('sort');
    return u.toString();
  }, [store, sort]);

  // Per-store result counts across the full (un-store-filtered) set so the
  // chip badges reflect what's actually there to drill into. Updates with
  // the underlying result, not with the user's chip pick.
  const storeCounts = React.useMemo(() => {
    const out: Partial<Record<Product['store'], number>> = {};
    for (const p of products ?? []) out[p.store] = (out[p.store] ?? 0) + 1;
    return out;
  }, [products]);

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
  const [categoryFilter, setCategoryFilter] = React.useState<Category | null>(null);
  const [priceBucket, setPriceBucket] = React.useState<PriceBucket | null>(null);

  // Quantile-based price-range thresholds across the store-filtered visible
  // set. Null when there isn't enough variation to make 3 buckets useful.
  const priceThresholds = React.useMemo(
    () => computePriceBuckets(visible.map((p) => p.finalPrice.amount)),
    [visible],
  );

  // Apply the category + price-bucket facets on top of `visible`. Price is
  // applied after category so the chips reflect the categorically-relevant
  // set rather than the whole store-filtered grid.
  const categoryFiltered = React.useMemo<Product[]>(() => {
    let arr = categoryFilter === null
      ? visible
      : visible.filter((p) => categorize(p.name).includes(categoryFilter));
    if (priceBucket !== null && priceThresholds) {
      arr = arr.filter((p) => bucketOf(p.finalPrice.amount, priceThresholds) === priceBucket);
    }
    return arr;
  }, [visible, categoryFilter, priceBucket, priceThresholds]);

  // Progressive disclosure — render 12 results, extend on scroll. Re-sorts /
  // store / category changes reset the cursor so the user always sees the
  // *new* result set from the top.
  const paginated = useProgressiveList({
    items: categoryFiltered,
    batchSize: 12,
    resetKey: `${q}|${store}|${sort}|${categoryFilter ?? 'all'}|${priceBucket ?? 'all'}`,
  });

  // Grid keyboard nav. Cols mirror the Tailwind grid breakpoints below: 1 / 2 /
  // 3 / 4. We pick 4 as the "fully-expanded" cols count — desktop traffic
  // dominates; mobile users won't be using arrow keys anyway. Enter on the
  // active cell opens the detail dialog for that product. Count tracks the
  // *paginated* visible window so arrows can't jump to hidden items.
  const grid = useGridKeyboardNav({
    count: paginated.visible.length,
    cols: 4,
    cellSelector: '[data-search-cell]',
    onEnter: (i) => {
      const p = paginated.visible[i];
      if (p) setDetail(p);
    },
    enabled: detail === null,
  });

  // Keyboard-infinite nav — when the user reaches the last visible cell and
  // there's more behind the curtain, auto-extend so arrow keys keep working
  // past the current batch (parity with the IntersectionObserver sentinel).
  React.useEffect(() => {
    if (paginated.hasMore && grid.activeIndex >= paginated.visible.length - 1) {
      paginated.loadMore();
    }
  }, [grid.activeIndex, paginated.hasMore, paginated.visible.length, paginated]);

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

  if (result.products.length === 0) {
    return <NoResultsView q={q} t={t} onHome={() => router.push('/')} />;
  }

  const top3: Product[] = pickTop3(result.products);

  return (
    <div className="container max-w-7xl pb-32 pt-6 md:pb-20">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="pill" onClick={() => router.push('/')} className="pl-2">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          {t('back')}
        </Button>
        <div className="flex items-center gap-2">
          {(() => {
            const uniqueStores = Object.keys(storeCounts).length;
            if (uniqueStores < 2) return null;
            return (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[10.5px] font-bold tracking-tight text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
                {t('storesCount', { n: uniqueStores })}
              </span>
            );
          })()}
          <ResultsBadge />
            <ShareButton
            title={tShare('titleSearch')}
            text={q}
            url={shareUrl}
            size="sm"
            variant="outline"
          />
        </div>
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

      <VerdictCard product={result.report.best} />

      <Clusters query={q} products={result.products} />

      <ReportCard report={result.report} />

      <PriceDistribution products={result.products} highlight={result.report.best} />

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
          <StickyFilterBar storeCounts={storeCounts} totalCount={products?.length ?? 0} />
        </div>
        <MockStoresNote />
        <CategoryChips
          products={visible}
          selected={categoryFilter}
          onSelect={setCategoryFilter}
        />
        <PriceBucketChips
          selected={priceBucket}
          onSelect={setPriceBucket}
          visible={priceThresholds !== null}
        />
        <div
          ref={grid.containerRef}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visible.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-ink-200 px-6 py-12 text-center text-ink-500 dark:border-ink-700 dark:text-ink-400">
              <p>{t('empty')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setStore('all')}
              >
                {t('emptyAction')}
              </Button>
            </div>
          ) : paginated.visible.length === 0 ? (
            // Store filter has matches but the category filter wiped them.
            // Without this branch the grid would render empty and silent.
            <div className="col-span-full rounded-2xl border border-dashed border-ink-200 px-6 py-12 text-center text-ink-500 dark:border-ink-700 dark:text-ink-400">
              <p>{t('categoryEmpty')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setCategoryFilter(null)}
              >
                {t('categoryEmptyAction')}
              </Button>
            </div>
          ) : (
            paginated.visible.map((p, i) => (
              <div
                key={p.id}
                data-search-cell=""
                {...grid.getCellProps(i)}
                className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <ProductCard product={p} onOpenDetail={setDetail} />
              </div>
            ))
          )}
        </div>

        {paginated.hasMore && (
          <>
            <div
              ref={paginated.sentinelRef}
              aria-hidden
              className="h-px w-full"
            />
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={paginated.loadMore}
                className="h-11 rounded-xl px-6 font-semibold"
              >
                {t('loadMore', { n: visible.length - paginated.visible.length })}
              </Button>
              <p className="text-[11px] text-ink-400 dark:text-ink-500">
                {t('loadMoreHint', { shown: paginated.visible.length, total: visible.length })}
              </p>
            </div>
          </>
        )}
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
      <FloatingCompareBar />

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

/**
 * Empty-state for "the search ran cleanly but matched zero products".
 * The original CTA shipped users back to /. Now we also surface their
 * own recent queries (skipping the current one) as one-tap chips so
 * the dead end becomes a soft pivot. Hidden when no relevant history.
 */
function NoResultsView({
  q,
  t,
  onHome,
}: {
  q: string;
  t: ReturnType<typeof useTranslations<'search'>>;
  onHome: () => void;
}) {
  const entries = useHistoryStore((s) => s.entries);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const suggestions = React.useMemo(() => {
    if (!mounted) return [];
    return entries.filter((e) => e.q.trim().length > 0 && e.q !== q).slice(0, 4);
  }, [mounted, entries, q]);

  return (
    <div className="container max-w-2xl py-20 text-center">
      <h1 className="text-2xl font-extrabold tracking-tighter2 md:text-3xl">
        {t('noResultsTitle')}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500 dark:text-ink-400">
        {t('noResultsDesc')}
      </p>
      <Button variant="primary" className="mt-6" onClick={onHome}>
        {t('noResultsCta')}
      </Button>

      {suggestions.length > 0 && (
        <div className="mx-auto mt-8 max-w-md">
          <div className="flex items-center justify-center gap-1 text-[10.5px] font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
            <Search className="h-3 w-3" strokeWidth={2.4} />
            {t('noResultsRecent')}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {suggestions.map((e) => (
              <Link
                key={e.id}
                href={`/search?q=${encodeURIComponent(e.q)}`}
                className="inline-flex max-w-[12rem] items-center rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] font-semibold tracking-tight text-ink-700 transition hover:border-accent-300 hover:text-accent-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-accent-300"
              >
                <span className="truncate">{e.q}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

