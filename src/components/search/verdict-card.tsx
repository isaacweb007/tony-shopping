'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Check, Sparkles, ArrowRight, Bookmark } from 'lucide-react';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { toast } from '@/stores/toast-store';
import { recordProductClick } from '@/stores/click-store';
import { affiliateUrl } from '@/lib/affiliate';
import { useCheckoutGuide } from '@/hooks/use-checkout-guide';
import { pushShortlistItem, deleteShortlistItem } from '@/lib/supabase/sync-shortlist';
import { formatMoney, formatCount, shipLabel } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  product: Product;
}

/**
 * VerdictCard — the "stop debating, Tony picked one" hero card.
 *
 * Hamlet syndrome (decision fatigue) is the biggest UX problem in compare-shop
 * tools. Showing 20 items side-by-side actively *increases* paralysis. Tony
 * solves this by promoting a single confident pick to the very top with three
 * short, concrete evidence lines and a single decisive CTA.
 *
 * The component lists evidence in priority order — the top reason that made
 * this item win is always shown first, regardless of how the score is composed.
 */
export function VerdictCard({ product }: Props) {
  const tv = useTranslations('verdict');
  const tg = useTranslations();
  const locale = useLocale() as AppLocale;

  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const inShortlist = useShortlistStore((s) => product.id in s.items);
  const toggleRaw = useShortlistStore((s) => s.toggle);
  const buyHref = affiliateUrl({ store: product.store, url: product.buyUrl });
  const { guard } = useCheckoutGuide();

  function onBuyClick(e: React.MouseEvent) {
    guard(
      {
        product,
        href: buyHref,
        onProceed: () => {
          recordProductClick(product, q, true);
          window.open(buyHref, '_blank', 'noopener,noreferrer');
        },
      },
      e,
    );
  }

  function toggle() {
    const added = toggleRaw(product);
    toast.success(
      added ? tg('toast.shortlistAdded') : tg('toast.shortlistRemoved'),
      product.name,
    );
    if (added) void pushShortlistItem(product);
    else void deleteShortlistItem(product.id);
  }

  // Build the evidence list — keep it small (3 lines max) so the user reads it.
  const evidence: string[] = [];
  if (product.score.total >= 80) {
    evidence.push(tv('reasonScore', { score: product.score.total }));
  }
  if (product.shipDays <= 2) {
    evidence.push(tv('reasonShip', { eta: shipLabel(product.shipDays, tg) }));
  }
  if (product.official) {
    evidence.push(tv('reasonOfficial', { store: product.store }));
  }
  if (product.authenticityPct >= 80) {
    evidence.push(tv('reasonAuth', { pct: product.authenticityPct }));
  }
  if (product.reviewCount >= 300) {
    evidence.push(
      tv('reasonReviews', { n: formatCount(product.reviewCount, locale), rating: product.rating }),
    );
  }
  // Always add price (it's the universal anchor).
  evidence.push(tv('reasonPrice', { price: formatMoney(product.finalPrice, locale) }));

  return (
    <div className="relative mt-6 overflow-hidden rounded-3xl border border-accent-300/70 bg-gradient-to-br from-accent-50 via-white to-sky-50 p-5 shadow-card dark:border-accent-700/50 dark:from-accent-950/40 dark:via-ink-900 dark:to-sky-950/30 md:p-7">
      {/* glow blob */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-400/30 blur-3xl" />

      {/* Eyebrow */}
      <div className="relative inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {tv('label')}
      </div>

      <div className="relative mt-3 grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
        {/* Product image */}
        <div className="hidden aspect-square overflow-hidden rounded-2xl bg-ink-50 dark:bg-ink-800 md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div className="flex flex-col">
          {/* Tagline */}
          <p className="text-[14px] font-semibold text-accent-700 dark:text-accent-300 md:text-[15px]">
            {tv('tagline')}
          </p>

          {/* Product name */}
          <h2 className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-tighter2 md:text-[28px]">
            {product.name}
          </h2>

          {/* Store + Price line */}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[12px] font-semibold text-ink-600 dark:text-ink-300">
              {product.store}
            </span>
            <span className="text-[24px] font-extrabold tracking-tighter2 md:text-[28px]">
              {formatMoney(product.finalPrice, locale)}
            </span>
            <span className="text-[11px] text-ink-500 dark:text-ink-400">
              {shipLabel(product.shipDays, tg)}
            </span>
          </div>

          {/* Evidence list — 3 lines max */}
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
              {tv('evidence')}
            </div>
            <ul className="space-y-1.5">
              {evidence.slice(0, 3).map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13.5px] text-ink-800 dark:text-ink-100"
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    strokeWidth={2.4}
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="primary" className="h-11 rounded-xl px-5 font-bold" asChild>
              <a
                href={buyHref}
                target="_blank"
                rel="noreferrer noopener sponsored"
                onClick={onBuyClick}
              >
                {tv('cta')}
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </a>
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl px-4"
              onClick={toggle}
              aria-pressed={inShortlist}
            >
              <Bookmark
                className="h-4 w-4"
                strokeWidth={1.8}
                {...(inShortlist ? { fill: 'currentColor' } : {})}
              />
              {inShortlist ? tg('detail.removeCompare') : tg('detail.addCompare')}
            </Button>
          </div>

          {/* Soft escape hatch — never trap the user in one choice */}
          <p className="mt-3 text-[11.5px] text-ink-500 dark:text-ink-400">
            {tv('alternative')}
          </p>
        </div>
      </div>
    </div>
  );
}
