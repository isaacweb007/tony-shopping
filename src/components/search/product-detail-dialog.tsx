'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, Star } from 'lucide-react';
import type { Product } from '@/types/product';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { formatMoney, formatCount, shipLabel } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface Props {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDialog({ product, onOpenChange }: Props) {
  const td = useTranslations('detail');
  const tc = useTranslations('card');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;
  const inShortlist = useShortlistStore((s) => (product ? s.ids.includes(product.id) : false));
  const toggle = useShortlistStore((s) => s.toggle);

  const open = product !== null;

  if (!product) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const verdict =
    product.score.total >= 85
      ? td('verdictGood')
      : product.score.total >= 75
        ? td('verdictOk')
        : td('verdictWeak');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">{td('title')}</DialogTitle>
        <DialogDescription className="sr-only">{product.name}</DialogDescription>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="aspect-square bg-ink-50 dark:bg-ink-800 md:aspect-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col p-5 md:p-6">
            <div className="flex items-center gap-2 text-[11px] text-ink-500 dark:text-ink-400">
              <span className="font-bold text-ink-800 dark:text-ink-100">{product.store}</span>
              {product.official && (
                <span className="rounded border border-sky-100 bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
                  {tc('official')}
                </span>
              )}
              <span className="text-ink-300 dark:text-ink-600">·</span>
              <span>
                {tc('similarity')} {product.score.similarity}%
              </span>
            </div>
            <h3 className="mt-2 text-[20px] font-extrabold leading-snug tracking-tighter2 md:text-[22px]">
              {product.name}
            </h3>
            <div className="mt-3 flex items-end gap-3">
              <div className="text-[28px] font-extrabold tracking-tighter2 md:text-[32px]">
                {formatMoney(product.finalPrice, locale)}
              </div>
              {product.discountPct > 0 && (
                <div className="text-sm font-bold text-red-600 dark:text-red-400">
                  -{product.discountPct}%
                </div>
              )}
            </div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">
              {td('productPrice')} {formatMoney(product.price, locale)} · {td('shipFee')}{' '}
              {product.shippingFee.amount === 0
                ? td('shipFree')
                : formatMoney(product.shippingFee, locale)}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label={td('shippingEta')} value={shipLabel(product.shipDays, tg)} />
              <Stat
                label={td('reviews')}
                value={
                  <span className="inline-flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {product.rating} · {formatCount(product.reviewCount, locale)}
                  </span>
                }
              />
              <Stat label={td('authentic')} value={`${product.authenticityPct}%`} />
            </div>

            <div className="mt-5 rounded-2xl border border-accent-200 bg-accent-50/50 p-4 dark:border-accent-800/60 dark:bg-accent-950/30">
              <div className="flex items-center gap-1.5 text-[13px] font-bold tracking-tight text-accent-700 dark:text-accent-300">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                {td('reportTitle')}
              </div>
              <Verdict product={product} verdict={verdict} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
                <Kv label={td('kSim')} value={`${product.score.similarity}%`} />
                <Kv label={td('kPrice')} value={`${product.score.priceEdge}%`} />
                <Kv label={td('kReview')} value={`${product.score.reviewTrust}%`} />
                <Kv label={td('kAuth')} value={`${product.score.authenticity}%`} />
              </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => toggle(product.id)}>
                {inShortlist ? td('removeCompare') : td('addCompare')}
              </Button>
              <Button variant="primary" className="h-11 rounded-xl font-bold" asChild>
                <a href={product.buyUrl} target="_blank" rel="noreferrer noopener">
                  {td('buyAt', { store: product.store })}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800">
      <div className="text-[10px] uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-bold">{value}</div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 dark:border-ink-700 dark:bg-ink-900">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Verdict({ product, verdict }: { product: Product; verdict: string }) {
  return (
    <p className={cn('mt-2 text-[13.5px] leading-relaxed text-ink-800 dark:text-ink-100')}>
      <b>Tony Score {product.score.total}</b> · {verdict}
    </p>
  );
}
