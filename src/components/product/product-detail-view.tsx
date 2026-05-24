'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, Sparkles, Star } from 'lucide-react';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/ui/share-button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { toast } from '@/stores/toast-store';
import { recordProductClick } from '@/stores/click-store';
import { affiliateUrl } from '@/lib/affiliate';
import { useRouter } from '@/i18n/routing';
import { formatMoney, formatCount, shipLabel } from '@/lib/format';
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

  const inShortlist = useShortlistStore((s) => s.ids.includes(product.id));
  const toggleRaw = useShortlistStore((s) => s.toggle);

  function toggle() {
    const willAdd = !inShortlist;
    toggleRaw(product.id);
    toast.success(
      willAdd ? tg('toast.shortlistAdded') : tg('toast.shortlistRemoved'),
      product.name,
    );
  }

  const verdict =
    product.score.total >= 85
      ? td('verdictGood')
      : product.score.total >= 75
        ? td('verdictOk')
        : td('verdictWeak');

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

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl bg-ink-50 dark:bg-ink-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-[12px] text-ink-500 dark:text-ink-400">
            <span className="font-bold text-ink-800 dark:text-ink-100">{product.store}</span>
            {product.official && (
              <span className="rounded border border-sky-100 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
                {tc('official')}
              </span>
            )}
            <span className="text-ink-300 dark:text-ink-600">·</span>
            <span>
              {tc('similarity')} {product.score.similarity}%
            </span>
          </div>
          <h1 className="mt-2 text-[24px] font-extrabold leading-snug tracking-tighter2 md:text-[28px]">
            {product.name}
          </h1>
          <div className="mt-3 flex items-end gap-3">
            <div className="text-[32px] font-extrabold tracking-tighter2 md:text-[40px]">
              {formatMoney(product.finalPrice, locale)}
            </div>
            {product.discountPct > 0 && (
              <div className="text-base font-bold text-red-600 dark:text-red-400">
                -{product.discountPct}%
              </div>
            )}
          </div>
          <div className="text-[12px] text-ink-500 dark:text-ink-400">
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
            <Stat label={td('authentic')} value={`${product.authenticityPct}%`} />
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

          <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
            <Button variant="outline" className="h-12 rounded-xl" onClick={toggle}>
              {inShortlist ? td('removeCompare') : td('addCompare')}
            </Button>
            <Button variant="primary" className="h-12 rounded-xl font-bold" asChild>
              <a
                href={affiliateUrl({ store: product.store, url: product.buyUrl })}
                target="_blank"
                rel="noreferrer noopener sponsored"
                onClick={() => recordProductClick(product, q, false)}
              >
                {td('buyAt', { store: product.store })}
              </a>
            </Button>
          </div>
        </div>
      </div>
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
