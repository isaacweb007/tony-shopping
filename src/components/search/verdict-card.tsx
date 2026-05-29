'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Crown,
  Sparkles,
  ShieldCheck,
  TrendingDown,
  Truck,
  Star,
  type LucideIcon,
} from 'lucide-react';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { useShortlistStore } from '@/stores/shortlist-store';
import { toast } from '@/stores/toast-store';
import { recordProductClick } from '@/stores/click-store';
import { recordSaving } from '@/stores/savings-store';
import { affiliateUrl } from '@/lib/affiliate';
import { useCheckoutGuide } from '@/hooks/use-checkout-guide';
import { haptic } from '@/lib/haptic';
import { pushShortlistItem, deleteShortlistItem } from '@/lib/supabase/sync-shortlist';
import { formatMoney, formatCount, shipLabel, storeDisplay } from '@/lib/format';
import { computeSavings } from '@/lib/savings';
import { DualMoney } from '@/components/ui/dual-money';
import { TonyScoreBreakdown } from './tony-score-breakdown';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  product: Product;
  /** Optional: peer products used to compute price savings vs median. */
  peers?: Product[];
}

type Confidence = 'strong' | 'recommended' | 'consider';

/**
 * VerdictCard — the premium "stop debating, Tony picked one" hero.
 *
 * Visual design intent:
 *   - One large product photo (left, big enough to feel like a hero shot).
 *   - One huge confident headline above the product name.
 *   - One bright "확신도 N%" pill that frames the verdict as a reasoned
 *     decision, not a suggestion.
 *   - Big tabular price + an inline "시세보다 X% 저렴" badge when applicable
 *     — savings are the strongest motivator in a meta-shop tool.
 *   - 3-4 evidence rows, each with a context-appropriate icon (not just
 *     generic checkmarks), so the reasons are scannable.
 *   - A primary CTA that is genuinely large + bright with a soft sheen.
 *
 * The component still lists evidence in priority order — the top reason
 * that made this item win is always shown first.
 */
export function VerdictCard({ product, peers }: Props) {
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
          // Bank the realized saving (vs market median) so the cumulative
          // "토니로 ₩X 아꼈어요" total grows when the user acts on the pick.
          if (savings.meaningful) {
            recordSaving({
              amount: savings.amount,
              currency: savings.currency,
              productName: product.name,
            });
          }
          window.open(buyHref, '_blank', 'noopener,noreferrer');
        },
      },
      e,
    );
  }

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

  // Confidence bucket — projects how strong the recommendation should feel.
  // 85+ = "강력 추천" (the user should feel like Tony is sure)
  // 70+ = "추천" (Tony is leaning this way)
  // else = "참고" (it's the best of a soft set)
  const confidence: Confidence =
    product.score.total >= 85
      ? 'strong'
      : product.score.total >= 70
        ? 'recommended'
        : 'consider';

  // Savings versus the peer median — the single most persuasive number a
  // shopper can see. computeSavings gives us both the % and the concrete
  // won/USD amount so we can show "시세보다 ₩42,000 저렴" not just "-18%".
  const savings = React.useMemo(
    () => computeSavings(product, peers ?? []),
    [product, peers],
  );
  const savingsPct = savings.meaningful ? savings.pct : 0;

  // Evidence list — built in confidence-projecting order with icons that
  // match the type of reason. Keep to 4 max so the scan stays cheap.
  type Reason = {
    icon: LucideIcon;
    text: string;
  };
  const evidence: Reason[] = [];
  if (product.score.total >= 80) {
    evidence.push({
      icon: Crown,
      text: tv('reasonScore', { score: product.score.total }),
    });
  }
  if (savingsPct > 0) {
    evidence.push({
      icon: TrendingDown,
      text: tv('reasonBelowMedian', { pct: savingsPct }),
    });
  }
  if (product.shipDays <= 2) {
    evidence.push({
      icon: Truck,
      text: tv('reasonShip', { eta: shipLabel(product.shipDays, tg) }),
    });
  }
  if (product.official) {
    evidence.push({
      icon: ShieldCheck,
      text: tv('reasonOfficial', { store: storeDisplay(product) }),
    });
  } else if (product.authenticityPct >= 80) {
    evidence.push({
      icon: ShieldCheck,
      text: tv('reasonAuth', { pct: product.authenticityPct }),
    });
  }
  if (product.reviewCount >= 300) {
    evidence.push({
      icon: Star,
      text: tv('reasonReviews', {
        n: formatCount(product.reviewCount, locale),
        rating: product.rating,
      }),
    });
  }
  if (evidence.length < 3) {
    evidence.push({
      icon: CheckCircle2,
      text: tv('reasonPrice', { price: formatMoney(product.finalPrice, locale) }),
    });
  }

  const confidenceLabel = tv(`confidence.${confidence}`);
  const confidencePct = Math.min(99, Math.max(50, product.score.total + 6));

  return (
    <div className="relative mt-6 overflow-hidden rounded-3xl border border-accent-300/70 bg-gradient-to-br from-accent-50 via-white to-sky-50 shadow-card dark:border-accent-700/50 dark:from-accent-950/40 dark:via-ink-900 dark:to-sky-950/30">
      {/* Decorative glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-400/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl"
      />

      {/* Top eyebrow row — verdict label + confidence pill */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 px-5 pt-5 md:px-7 md:pt-7">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-[11px] font-bold tracking-wider text-white shadow-sm dark:bg-white dark:text-ink-900">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
          {tv(`label.${confidence}`)}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-300/80 bg-white/80 px-3 py-1.5 text-[11px] font-bold tracking-wide text-accent-700 backdrop-blur dark:border-accent-700/60 dark:bg-ink-900/70 dark:text-accent-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
          </span>
          {tv('confidencePill', { pct: confidencePct })}
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-6 p-5 md:grid-cols-[240px_1fr] md:gap-7 md:p-7">
        {/* Product image — generous hero shot */}
        <div className="relative hidden aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-white to-ink-100 shadow-sm ring-1 ring-ink-200/50 dark:from-ink-800 dark:to-ink-900 dark:ring-ink-700/40 md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-5"
          />
          {/* Score chip floating on the image */}
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-ink-900/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur dark:bg-white/90 dark:text-ink-900">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
            {tv('scorePill', { score: product.score.total })}
          </div>
        </div>

        <div className="flex flex-col">
          {/* Big confident headline */}
          <p className="text-[15px] font-semibold text-accent-700 dark:text-accent-300 md:text-[16px]">
            {tv(`tagline.${confidence}`)}
          </p>

          {/* Product name */}
          <h2 className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-tighter2 md:text-[30px]">
            {product.name}
          </h2>

          {/* Merchant · ship · review meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-600 dark:text-ink-300">
            <span className="font-semibold">{storeDisplay(product)}</span>
            {product.official && (
              <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                {tg('card.official')}
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

          {/* Big price block + savings pill */}
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <DualMoney money={product.finalPrice} size="xl" layout="stacked" />
            {savingsPct > 0 && (
              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.4} />
                {tv('savingsPill', { pct: savingsPct })}
              </div>
            )}
          </div>

          {/* Concrete savings statement — the felt "why Tony" number.
              Shows the actual won/USD saved vs the market median, far more
              persuasive than the % pill alone. */}
          {savings.meaningful && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/40 px-3 py-2 dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-emerald-950/10">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.6} />
              </span>
              <span className="text-[13.5px] font-bold text-emerald-800 dark:text-emerald-200">
                {tv('savingsStatement', {
                  amount: formatMoney(
                    { amount: savings.amount, currency: savings.currency },
                    locale,
                  ),
                })}
              </span>
            </div>
          )}

          {/* Evidence list */}
          <div className="mt-5">
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
              {tv('evidence')}
            </div>
            <ul className="space-y-2">
              {evidence.slice(0, 4).map((e, i) => {
                const Icon = e.icon;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-800 dark:text-ink-100 md:text-[14px]"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="font-medium">{e.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Tony Score transparency — expandable so the recommendation can
              be audited (trust comes from "why 94?" being answerable). */}
          <details className="group/score mt-4 rounded-xl border border-ink-200 bg-white/60 px-3.5 py-2.5 dark:border-ink-800 dark:bg-ink-900/50">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-bold text-ink-700 dark:text-ink-200">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400" strokeWidth={2.2} />
                {tv('whyScore', { score: product.score.total })}
              </span>
              <span className="text-ink-400 transition-transform group-open/score:rotate-180 dark:text-ink-500">
                <ArrowRight className="h-3.5 w-3.5 rotate-90" strokeWidth={2.2} />
              </span>
            </summary>
            <TonyScoreBreakdown score={product.score} className="mt-3" />
          </details>

          {/*
            Meta-shop offer rail — when the clusterer found this same
            product at other merchants, surface them as full rows so the
            user can comparison-shop right inside the verdict card. The
            canonical merchant (already shown in the meta row above) is
            implicit as the recommended pick; the rail shows alternates
            ranked by price ascending.
          */}
          {product.offers && product.offers.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                {tv('availableAt', { n: product.offers.length + 1 })}
              </div>
              <ul className="space-y-1.5">
                {product.offers.slice(0, 4).map((o) => (
                  <li key={o.merchantName + o.price.amount}>
                    <a
                      href={o.buyUrl}
                      target="_blank"
                      rel="noreferrer noopener sponsored"
                      className="group/offer flex items-center justify-between gap-2 rounded-xl border border-ink-200/80 bg-white/70 px-3 py-2 text-[13px] transition hover:border-accent-300 hover:bg-white dark:border-ink-700/80 dark:bg-ink-900/70 dark:hover:border-accent-500 dark:hover:bg-ink-900"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-semibold text-ink-800 dark:text-ink-100">
                          {o.merchantName}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-500 dark:text-ink-400">
                          {shipLabel(o.shipDays, tg)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-extrabold tabular-nums text-ink-900 dark:text-ink-50">
                          {formatMoney(o.price, locale)}
                        </span>
                        <ArrowRight
                          className="h-3.5 w-3.5 text-ink-400 transition-transform group-hover/offer:translate-x-0.5 group-hover/offer:text-accent-600 dark:text-ink-500 dark:group-hover/offer:text-accent-400"
                          strokeWidth={2.2}
                        />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              {product.offers.length > 4 && (
                <div className="mt-1.5 text-[11px] text-ink-400 dark:text-ink-500">
                  {tv('moreMerchants', { n: product.offers.length - 4 })}
                </div>
              )}
            </div>
          )}

          {/* Big CTA + secondary actions */}
          <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-center">
            <Button
              variant="primary"
              className="group/cta relative h-12 flex-1 overflow-hidden rounded-2xl px-5 text-[15px] font-extrabold tracking-tight shadow-md transition-shadow hover:shadow-lg md:h-14 md:text-[16px]"
              asChild
            >
              <a
                href={buyHref}
                target="_blank"
                rel="noreferrer noopener sponsored"
                onClick={onBuyClick}
                className="inline-flex items-center justify-center gap-2"
              >
                {/* Soft sheen — moves across the button once on hover */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
                />
                <span className="relative">{tv(`cta.${confidence}`)}</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" strokeWidth={2.4} />
              </a>
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl px-4 text-[13px] font-bold md:h-14"
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

          <p className="mt-3 text-[11.5px] text-ink-500 dark:text-ink-400">
            {tv('alternative')}
          </p>

          {/* Honest price disclaimer — sets expectations so a stale/changed
              price never feels like a betrayal. Trust > polish. */}
          <p className="mt-1.5 flex items-start gap-1 text-[11px] text-ink-400 dark:text-ink-500">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
            <span>{tv('priceDisclaimer')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
