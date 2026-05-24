'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, Star } from 'lucide-react';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { TagBadge } from './tag-badge';
import { TonyBar } from './tony-bar';
import { useShortlistStore } from '@/stores/shortlist-store';
import { toast } from '@/stores/toast-store';
import { recordProductClick } from '@/stores/click-store';
import { affiliateUrl } from '@/lib/affiliate';
import { formatMoney, formatCount, shipLabel } from '@/lib/format';
import { useSearchParams } from 'next/navigation';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  product: Product;
  /** "feature" = full TOP3 card, "compact" = grid card. */
  variant?: 'feature' | 'compact';
  onOpenDetail?: (product: Product) => void;
}

export function ProductCard({ product, variant = 'compact', onOpenDetail }: Props) {
  const tc = useTranslations('card');
  const locale = useLocale() as AppLocale;
  const t = useTranslations();
  const params = useSearchParams();
  const q = params?.get('q') ?? '';
  const inShortlist = useShortlistStore((s) => s.ids.includes(product.id));
  const toggleRaw = useShortlistStore((s) => s.toggle);
  const buyHref = affiliateUrl({ store: product.store, url: product.buyUrl });

  const toggle = React.useCallback(
    (id: string) => {
      const willAdd = !inShortlist;
      toggleRaw(id);
      toast.success(
        willAdd ? t('toast.shortlistAdded') : t('toast.shortlistRemoved'),
        product.name,
      );
    },
    [inShortlist, toggleRaw, t, product.name],
  );

  const isFeature = variant === 'feature';

  return (
    <div
      className={
        isFeature
          ? 'group flex flex-col rounded-3xl border border-ink-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover dark:border-ink-800 dark:bg-ink-900 md:p-5'
          : 'group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white transition hover:-translate-y-0.5 hover:shadow-card dark:border-ink-800 dark:bg-ink-900'
      }
    >
      {isFeature ? (
        <div className="flex items-center justify-between">
          <TagBadge tag={product.tag} />
          <BookmarkBtn pressed={inShortlist} onClick={() => toggle(product.id)} />
        </div>
      ) : null}

      <div
        className={
          isFeature
            ? 'mt-3 aspect-[4/3] overflow-hidden rounded-2xl bg-ink-50 dark:bg-ink-800'
            : 'relative aspect-[4/3] overflow-hidden bg-ink-50 dark:bg-ink-800'
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
        {!isFeature && (
          <>
            <div className="absolute left-2 top-2">
              <TagBadge tag={product.tag} size="sm" withIcon={false} />
            </div>
            <BookmarkBtn
              pressed={inShortlist}
              onClick={() => toggle(product.id)}
              floating
            />
            {product.discountPct > 0 && (
              <div className="absolute bottom-2 left-2 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                -{product.discountPct}%
              </div>
            )}
          </>
        )}
      </div>

      <div className={isFeature ? 'mt-3' : 'flex flex-1 flex-col p-3'}>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-500 dark:text-ink-400">
          <span className="font-semibold text-ink-800 dark:text-ink-100">{product.store}</span>
          {product.official && (
            <span className="rounded-md border border-sky-100 bg-sky-50 px-1 py-0.5 text-[9px] font-bold tracking-wider text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
              {tc('official')}
            </span>
          )}
          <span className="text-ink-300 dark:text-ink-600">·</span>
          <span>
            {tc('similarity')} {product.score.similarity}%
          </span>
        </div>
        <div
          className={
            isFeature
              ? 'mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight'
              : 'mt-1 line-clamp-2 text-[13.5px] font-semibold leading-tight tracking-tight'
          }
        >
          {product.name}
        </div>

        <div className={isFeature ? 'mt-3 flex items-end justify-between' : 'mt-2 flex items-end justify-between'}>
          <div>
            {product.discountPct > 0 && (
              <div className="text-[11px] text-ink-400 line-through dark:text-ink-500">
                {formatMoney(
                  {
                    amount:
                      product.price.amount +
                      Math.round((product.price.amount * product.discountPct) / 100),
                    currency: product.price.currency,
                  },
                  locale,
                )}
              </div>
            )}
            <div
              className={
                isFeature
                  ? 'text-[24px] font-extrabold tracking-tighter2'
                  : 'text-[16px] font-extrabold tracking-tighter2'
              }
            >
              {formatMoney(product.finalPrice, locale)}
            </div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">
              {isFeature ? `${tc('incShip')} · ${shipLabel(product.shipDays, t)}` : shipLabel(product.shipDays, t)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-ink-400 dark:text-ink-500">
              {tc('score')}
            </div>
            <div
              className={
                isFeature
                  ? 'text-[22px] font-extrabold leading-none text-accent-600 dark:text-accent-400'
                  : 'text-[14px] font-extrabold leading-none text-accent-600 dark:text-accent-400'
              }
            >
              {product.score.total}
              {isFeature && <span className="text-sm text-ink-300 dark:text-ink-600">/100</span>}
            </div>
          </div>
        </div>

        <TonyBar value={product.score.total} className="mt-2.5" />

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-500 dark:text-ink-400">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {product.rating} · {formatCount(product.reviewCount, locale)}{' '}
            {!isFeature ? '' : tc('reviews')}
          </span>
          <span>
            {tc('authentic')} {product.authenticityPct}%
          </span>
        </div>

        <div className={isFeature ? 'mt-4 grid grid-cols-2 gap-2' : 'mt-3 flex gap-2'}>
          <Button
            variant="outline"
            className={isFeature ? 'h-10 rounded-xl text-[13px]' : 'h-9 flex-1 rounded-lg text-[12px]'}
            onClick={() => onOpenDetail?.(product)}
          >
            {isFeature ? tc('viewReport') : tc('report')}
          </Button>
          <Button
            variant="primary"
            className={
              isFeature
                ? 'h-10 rounded-xl text-[13px] font-bold'
                : 'h-9 flex-1 rounded-lg text-[12px] font-bold'
            }
            asChild
          >
            <a
              href={buyHref}
              target="_blank"
              rel="noreferrer noopener sponsored"
              onClick={() => recordProductClick(product, q, false)}
            >
              {isFeature ? tc('buyNow') : tc('buy')}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function BookmarkBtn({
  pressed,
  onClick,
  floating,
}: {
  pressed: boolean;
  onClick: () => void;
  floating?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label="Add to compare"
      className={
        floating
          ? 'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-ink-200/70 bg-white/90 backdrop-blur transition hover:text-accent-600 dark:border-ink-700/70 dark:bg-ink-900/80 dark:hover:text-accent-400'
          : 'text-ink-300 transition hover:text-accent-600 dark:text-ink-600 dark:hover:text-accent-400'
      }
    >
      <Bookmark
        className={floating ? 'h-[15px] w-[15px]' : 'h-[18px] w-[18px]'}
        strokeWidth={1.6}
        {...(pressed ? { fill: 'currentColor' } : {})}
      />
    </button>
  );
}
