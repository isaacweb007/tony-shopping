'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, Sparkles, Star, ShieldCheck, Truck, TrendingDown } from 'lucide-react';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/ui/share-button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { toast } from '@/stores/toast-store';
import { recordProductClick } from '@/stores/click-store';
import { affiliateUrl } from '@/lib/affiliate';
import { useCheckoutGuide } from '@/hooks/use-checkout-guide';
import { haptic } from '@/lib/haptic';
import { ReviewAnalysis } from '@/components/search/review-analysis';
import { ProductAnalysisCard } from '@/components/product/product-analysis-card';
import { PriceSparkline } from '@/components/product/price-sparkline';
import { FloatingCompareBar } from '@/components/product/floating-compare-bar';
import { RelatedProducts } from '@/components/product/related-products';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { useRecentProductsStore } from '@/stores/recent-products-store';
import { pushShortlistItem, deleteShortlistItem } from '@/lib/supabase/sync-shortlist';
import { useRouter } from '@/i18n/routing';
import { formatMoney, formatCount, shipLabel, storeDisplay } from '@/lib/format';
import { DualMoney } from '@/components/ui/dual-money';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  product: Product;
  q: string;
}

export function ProductDetailView({ product, q }: Props) {
  const td = useTranslations('detail');
  const tc = useTranslations('card');
  const tg = useTranslations();
  const tShare = useTranslations('share');
  const t = useTranslations('search');
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  const inShortlist = useShortlistStore((s) => product.id in s.items);
  const toggleRaw = useShortlistStore((s) => s.toggle);
  const priceWatch = usePriceWatchStore((s) => s.snapshots[product.id] ?? null);
  const trackPrice = usePriceWatchStore((s) => s.track);
  const dismissPrice = usePriceWatchStore((s) => s.dismiss);
  const watched = priceWatch !== null;
  const { guard } = useCheckoutGuide();
  const recordView = useRecentProductsStore((s) => s.record);

  // Stamp the recently-viewed feed once per (product, query) visit. Effect
  // re-runs on product.id / q so back-button into the same detail bumps
  // viewedAt without piling duplicates (store dedupes by id internally).
  React.useEffect(() => {
    recordView(product, q);
  }, [recordView, product, q]);

  function toggle() {
    const added = toggleRaw(product);
    haptic('tap');
    toast.success(
      added ? tg('toast.shortlistAdded') : tg('toast.shortlistRemoved'),
      product.name,
    );
    if (added) void pushShortlistItem(product);
    else void deleteShortlistItem(product.id);
  }

  const verdict =
    product.score.total >= 85
      ? td('verdictGood')
      : product.score.total >= 75
        ? td('verdictOk')
        : td('verdictWeak');

  // Confidence bucket — projects how decisive Tony's recommendation should
  // feel on the detail page. Same buckets as the search VerdictCard.
  const confidence: 'strong' | 'recommended' | 'consider' =
    product.score.total >= 85
      ? 'strong'
      : product.score.total >= 70
        ? 'recommended'
        : 'consider';
  const confidencePct = Math.min(99, Math.max(50, product.score.total + 6));

  return (
    <div className="container max-w-5xl pb-32 pt-6 md:pb-20">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="pill"
          onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
          className="pl-2"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          {t('back')}
        </Button>
        <ShareButton
          title={tShare('titleProduct')}
          text={product.name}
          url={typeof window === 'undefined' ? '' : window.location.href}
          size="sm"
          variant="outline"
        />
      </div>

      {/*
        Premium product hero. Mirrors the /search VerdictCard visual language:
        confidence-bucketed top banner, large object-contain image with a
        score chip, generous typography, signal pills (official / 평점 /
        배송), then the Tony reasoning panel — same accent gradient and
        glow blobs so navigating from /search → /product feels continuous.
      */}
      <div className="relative mt-4 overflow-hidden rounded-3xl border border-accent-300/60 bg-gradient-to-br from-accent-50/70 via-white to-sky-50/40 shadow-card dark:border-accent-700/40 dark:from-accent-950/30 dark:via-ink-900 dark:to-sky-950/20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-400/30 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl"
            />

            <div className="relative flex flex-wrap items-center justify-between gap-2 px-5 pt-5 md:px-7 md:pt-7">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-[11px] font-bold tracking-wider text-white shadow-sm dark:bg-white dark:text-ink-900">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
                {tg(`verdict.label.${confidence}`)}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-300/80 bg-white/80 px-3 py-1.5 text-[11px] font-bold tracking-wide text-accent-700 backdrop-blur dark:border-accent-700/60 dark:bg-ink-900/70 dark:text-accent-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-accent-500 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
                </span>
                {tg('verdict.confidencePill', { pct: confidencePct })}
              </div>
            </div>

            <div className="relative grid grid-cols-1 gap-6 p-5 md:grid-cols-2 md:gap-7 md:p-7">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-white to-ink-100 shadow-sm ring-1 ring-ink-200/50 dark:from-ink-800 dark:to-ink-900 dark:ring-ink-700/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-contain p-6"
                />
                <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-ink-900/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur dark:bg-white/90 dark:text-ink-900">
                  <Sparkles className="h-3 w-3" strokeWidth={2.4} />
                  {tg('verdict.scorePill', { score: product.score.total })}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-600 dark:text-ink-300">
                  <span className="font-semibold">{storeDisplay(product)}</span>
                  {product.official && (
                    <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                      {tc('official')}
                    </span>
                  )}
                  <span className="text-ink-300 dark:text-ink-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {product.rating} · {formatCount(product.reviewCount, locale)}
                  </span>
                  <span className="text-ink-300 dark:text-ink-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3 w-3" strokeWidth={1.8} />
                    {shipLabel(product.shipDays, tg)}
                  </span>
                </div>
                <h1 className="mt-2 text-[24px] font-extrabold leading-tight tracking-tighter2 md:text-[30px]">
                  {product.name}
                </h1>

                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <DualMoney money={product.finalPrice} size="xl" layout="stacked" />
                  {product.discountPct > 0 && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.4} />
                      -{product.discountPct}%
                    </div>
                  )}
                </div>
                <div className="mt-1 text-[12px] text-ink-500 dark:text-ink-400">
                  {td('productPrice')} {formatMoney(product.price, locale)} · {td('shipFee')}{' '}
                  {product.shippingFee.amount === 0
                    ? td('shipFree')
                    : formatMoney(product.shippingFee, locale)}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <Stat label={td('shippingEta')} value={shipLabel(product.shipDays, tg)} />
                  <Stat
                    label={td('reviews')}
                    value={
                      <span className="inline-flex items-center justify-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {product.rating} · {formatCount(product.reviewCount, locale)}
                      </span>
                    }
                  />
                  <Stat
                    label={td('authentic')}
                    value={
                      <span className="inline-flex items-center justify-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        {product.authenticityPct}%
                      </span>
                    }
                  />
                </div>

          <div className="mt-6 rounded-2xl border border-accent-200 bg-accent-50/50 p-5 dark:border-accent-800/60 dark:bg-accent-950/30">
            <div className="flex items-center gap-1.5 text-[14px] font-bold tracking-tight text-accent-700 dark:text-accent-300">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              {td('reportTitle')}
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-800 dark:text-ink-100">
              <b>Tony Score {product.score.total}</b> · {verdict}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <Kv label={td('kSim')} value={`${product.score.similarity}%`} />
              <Kv label={td('kPrice')} value={`${product.score.priceEdge}%`} />
              <Kv label={td('kReview')} value={`${product.score.reviewTrust}%`} />
              <Kv label={td('kAuth')} value={`${product.score.authenticity}%`} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (watched) dismissPrice(product.id);
                else trackPrice(product);
              }}
              aria-pressed={watched}
              className={
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold tracking-tight transition ' +
                (watched
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200')
              }
            >
              <span className={'h-1.5 w-1.5 rounded-full ' + (watched ? 'bg-emerald-500' : 'bg-ink-400')} />
              {watched ? td('watching') : td('watchPrice')}
            </button>
            {/*
              Deep-link "more from this store" — opens /search with the
              same query but biased by &store=. SearchView reads the
              param and applies the store filter on mount.
            */}
            <a
              href={`/search?q=${encodeURIComponent(q)}&store=${encodeURIComponent(product.store)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-bold tracking-tight text-ink-700 transition hover:border-accent-300 hover:text-accent-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-accent-300"
            >
              {td('moreFromStore', { store: storeDisplay(product) })}
            </a>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
            <Button variant="outline" className="h-12 rounded-xl" onClick={toggle}>
              {inShortlist ? td('removeCompare') : td('addCompare')}
            </Button>
            <Button variant="primary" className="h-12 rounded-xl font-bold" asChild>
              <a
                href={affiliateUrl({ store: product.store, url: product.buyUrl })}
                target="_blank"
                rel="noreferrer noopener sponsored"
                onClick={(e) => {
                  const href = affiliateUrl({ store: product.store, url: product.buyUrl });
                  guard(
                    {
                      product,
                      href,
                      onProceed: () => {
                        recordProductClick(product, q, false);
                        window.open(href, '_blank', 'noopener,noreferrer');
                      },
                    },
                    e,
                  );
                }}
              >
                {td('buyAt', { store: storeDisplay(product) })}
              </a>
            </Button>
          </div>
        </div>
      </div>
      </div>

      <ProductAnalysisCard product={product} className="mt-8" />

      <PriceSparkline snapshot={priceWatch} className="mt-6" />

      <ReviewAnalysis product={product} />

      <RelatedProducts product={product} />

      <FloatingCompareBar />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800">
      <div className="text-[10px] uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {label}
      </div>
      <div className="mt-1 text-[13.5px] font-bold">{value}</div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-2.5 py-2 dark:border-ink-700 dark:bg-ink-900">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
