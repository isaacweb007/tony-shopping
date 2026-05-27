'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, BellRing, Bookmark, Star } from 'lucide-react';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { TagBadge } from './tag-badge';
import { TonyBar } from './tony-bar';
import { useShortlistStore } from '@/stores/shortlist-store';
import { useRecentProductsStore } from '@/stores/recent-products-store';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { useUIStore } from '@/stores/ui-store';
import { toast } from '@/stores/toast-store';
import { recordProductClick } from '@/stores/click-store';
import { affiliateUrl } from '@/lib/affiliate';
import { useCheckoutGuide } from '@/hooks/use-checkout-guide';
import { haptic } from '@/lib/haptic';
import { pushShortlistItem, deleteShortlistItem } from '@/lib/supabase/sync-shortlist';
import { formatMoney, formatCount, shipLabel, storeDisplay } from '@/lib/format';
import { DualMoney } from '@/components/ui/dual-money';
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
  const inShortlist = useShortlistStore((s) => product.id in s.items);
  const toggleRaw = useShortlistStore((s) => s.toggle);
  // If the user already opened this product in the past, surface a small
  // "Seen" pill so they recognise it in the grid. Hydration-safe — the
  // store returns [] on the server pass.
  const recentSeen = useRecentProductsStore(
    (s) => s.items.findIndex((it) => it.id === product.id) >= 0,
  );
  // Standalone price-watch toggle — same store as the detail page's pill.
  // Lets the user start tracking a price without opening the full detail.
  const watching = usePriceWatchStore((s) => product.id in s.snapshots);
  const trackPrice = usePriceWatchStore((s) => s.track);
  const dismissPrice = usePriceWatchStore((s) => s.dismiss);
  const openShortlist = useUIStore((s) => s.setShortlistOpen);
  const buyHref = affiliateUrl({ store: product.store, url: product.buyUrl });
  const { guard } = useCheckoutGuide();

  const onBuyClick = React.useCallback(
    (e: React.MouseEvent) => {
      guard(
        {
          product,
          href: buyHref,
          onProceed: () => {
            recordProductClick(product, q, false);
            window.open(buyHref, '_blank', 'noopener,noreferrer');
          },
        },
        e,
      );
    },
    [guard, product, buyHref, q],
  );

  const toggle = React.useCallback(() => {
    const added = toggleRaw(product);
    haptic('tap');
    if (added) {
      // Adds get a "열기" action so the user can review the shortlist
      // immediately without hunting for the header bookmark icon.
      toast.success(t('toast.shortlistAdded'), {
        description: product.name,
        action: {
          label: t('toast.shortlistOpen'),
          onClick: () => openShortlist(true),
        },
      });
      void pushShortlistItem(product);
    } else {
      toast.success(t('toast.shortlistRemoved'), product.name);
      void deleteShortlistItem(product.id);
    }
  }, [toggleRaw, t, product, openShortlist]);

  const toggleWatch = React.useCallback(() => {
    haptic('tap');
    if (watching) {
      dismissPrice(product.id);
      toast.success(t('toast.watchOff'), product.name);
    } else {
      trackPrice(product);
      toast.success(t('toast.watchOn'), product.name);
    }
  }, [watching, dismissPrice, trackPrice, product, t]);

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
          <BookmarkBtn pressed={inShortlist} onClick={toggle} />
        </div>
      ) : null}

      <div
        className={
          isFeature
            ? 'relative mt-3 aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-ink-50 to-ink-100 dark:from-ink-800 dark:to-ink-900'
            : 'relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-ink-50 to-ink-100 dark:from-ink-800 dark:to-ink-900'
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
        {!isFeature && (
          <>
            <div className="absolute left-2 top-2">
              <TagBadge tag={product.tag} size="sm" withIcon={false} />
            </div>
            <BookmarkBtn
              pressed={inShortlist}
              onClick={toggle}
              floating
            />
            <WatchBtn
              pressed={watching}
              onClick={toggleWatch}
              label={watching ? tc('watchOnAria') : tc('watchOffAria')}
            />
            {recentSeen && (
              <div className="absolute bottom-2 right-2 rounded-md bg-ink-900/75 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur dark:bg-white/80 dark:text-ink-900">
                {tc('recentViewed')}
              </div>
            )}
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
          <span className="font-semibold text-ink-800 dark:text-ink-100">{storeDisplay(product)}</span>
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
            <DualMoney money={product.finalPrice} size={isFeature ? 'xl' : 'md'} layout="stacked" />
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

        {/*
          Meta-shop offer rail — sibling listings of the same product from
          other merchants. Renders inline below the meta row so users see
          "Apple AirPods Pro 2 — also at KREAM ₩48K / 11번가 ₩52K" without
          having to open the detail.
        */}
        {product.offers && product.offers.length > 0 && (
          <div className="mt-2.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
              {tc('alsoAt', { n: product.offers.length + 1 })}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {product.offers.slice(0, isFeature ? 4 : 3).map((o) => (
                <a
                  key={o.merchantName + o.price.amount}
                  href={o.buyUrl}
                  target="_blank"
                  rel="noreferrer noopener sponsored"
                  className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-700 transition hover:border-accent-300 hover:text-accent-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-accent-300"
                  title={`${o.merchantName} ${formatMoney(o.price, locale)}`}
                >
                  <span className="max-w-[80px] truncate">{o.merchantName}</span>
                  <span className="font-bold tabular-nums">
                    {formatMoney(o.price, locale)}
                  </span>
                </a>
              ))}
              {product.offers.length > (isFeature ? 4 : 3) && (
                <span className="inline-flex items-center rounded-md border border-dashed border-ink-200 px-1.5 py-0.5 text-[10.5px] text-ink-500 dark:border-ink-700 dark:text-ink-400">
                  {tc('moreOffers', { n: product.offers.length - (isFeature ? 4 : 3) })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action bar — Buy is the primary action and gets ~2/3 of the row.
            Report is secondary and shrinks to a fixed pill on compact cards. */}
        <div
          className={
            isFeature
              ? 'mt-4 grid grid-cols-[auto_1fr] gap-2'
              : 'mt-3 grid grid-cols-[auto_1fr] gap-2'
          }
        >
          <Button
            variant="outline"
            className={
              isFeature
                ? 'h-11 rounded-xl px-4 text-[13px]'
                : 'h-10 rounded-lg px-3 text-[12px]'
            }
            onClick={() => onOpenDetail?.(product)}
          >
            {isFeature ? tc('viewReport') : tc('report')}
          </Button>
          <Button
            variant="primary"
            className={
              isFeature
                ? 'h-11 rounded-xl text-[14px] font-extrabold tracking-tight shadow-sm transition-shadow hover:shadow-md'
                : 'h-10 rounded-lg text-[13px] font-extrabold tracking-tight shadow-sm transition-shadow hover:shadow-md'
            }
            asChild
          >
            <a
              href={buyHref}
              target="_blank"
              rel="noreferrer noopener sponsored"
              onClick={onBuyClick}
              className="inline-flex items-center justify-center gap-1.5"
            >
              {isFeature ? tc('buyNow') : tc('buy')}
              <span aria-hidden="true">→</span>
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

/**
 * Floating watch toggle on the image overlay — slots below the bookmark.
 * Switches between Bell (off) and BellRing (on) with an emerald accent
 * when active. Always floating (never the inline variant) so it only
 * appears on compact cards where there's image real estate to host it.
 */
function WatchBtn({
  pressed,
  onClick,
  label,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
}) {
  const Icon = pressed ? BellRing : Bell;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={
        'absolute right-2 top-11 flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur transition ' +
        (pressed
          ? 'border-emerald-300/70 bg-emerald-50/90 text-emerald-700 hover:text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:text-emerald-200'
          : 'border-ink-200/70 bg-white/90 text-ink-500 hover:text-emerald-600 dark:border-ink-700/70 dark:bg-ink-900/80 dark:text-ink-400 dark:hover:text-emerald-400')
      }
    >
      <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
    </button>
  );
}
