'use client';

import {
  Baby,
  Cpu,
  Dog,
  Dumbbell,
  Flame,
  ShoppingBag,
  Shirt,
  Sofa,
  TrendingDown,
  Truck,
  UtensilsCrossed,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useDeals } from '@/hooks/use-deals';
import { ProductImage } from '@/components/ui/product-image';
import { DualMoney } from '@/components/ui/dual-money';
import { formatMoneyLocale, storeDisplay } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DealItem } from '@/app/api/deals/route';
import type { StoreId } from '@/types/product';
import type { AppLocale } from '@/i18n/routing';

const CATEGORY_ICON: Record<string, LucideIcon> = {
  electronics: Cpu,
  beauty: Wand2,
  home: Sofa,
  kitchen: UtensilsCrossed,
  fashion: Shirt,
  sports: Dumbbell,
  baby: Baby,
  pet: Dog,
  other: ShoppingBag,
};

/**
 * "오늘의 딜" — a daily-refreshed rail of the best-priced products Tony found
 * across popular queries. Shown to everyone (no history needed), so it doubles
 * as a cold-start surface and a reason to come back each day.
 *
 * Renders skeletons while loading and nothing on failure / empty, so the home
 * page never shows a broken strip — same defensive pattern as the personalised
 * and editor-pick rails above it.
 */
export function DealFeed() {
  const t = useTranslations('home.deals');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { data, isLoading, isError } = useDeals();

  if (isError) return null;
  if (!isLoading && (!data || data.deals.length === 0)) return null;

  return (
    <section className="mt-10" aria-label={t('aria')}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-2.5 py-1 text-[10.5px] font-bold tracking-wider text-white shadow-sm">
        <Flame className="h-3 w-3" strokeWidth={2.4} />
        {t('label')}
      </div>
      <h2 className="mt-2 text-[18px] font-extrabold tracking-tighter2 md:text-[22px]">
        {t('headline')}
      </h2>
      <p className="mt-0.5 text-[12.5px] text-ink-500 dark:text-ink-400">{t('subtitle')}</p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} />)
          : data!.deals.map((d) => (
              <DealCard
                key={d.id}
                deal={d}
                locale={locale}
                t={t}
                onClick={() => router.push(`/search?q=${encodeURIComponent(d.query)}`)}
              />
            ))}
      </div>
    </section>
  );
}

function DealCard({
  deal,
  locale,
  t,
  onClick,
}: {
  deal: DealItem;
  locale: AppLocale;
  t: ReturnType<typeof useTranslations<'home.deals'>>;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICON[deal.category] ?? ShoppingBag;
  const store = storeDisplay({ store: deal.store as StoreId, merchantName: deal.merchantName });
  const shipLabel =
    deal.shipDays <= 0
      ? t('shipToday')
      : deal.shipDays === 1
        ? t('shipTomorrow')
        : t('shipDays', { n: deal.shipDays });

  return (
    <button
      type="button"
      onClick={onClick}
      className="group/deal flex items-stretch gap-3 overflow-hidden rounded-2xl border border-ink-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-card dark:border-ink-800 dark:bg-ink-900 dark:hover:border-rose-700"
    >
      <div className="relative shrink-0">
        <ProductImage
          src={deal.imageUrl}
          alt={deal.name}
          fallbackIcon={Icon}
          className="relative aspect-square w-24 overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800"
          imgClassName="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/deal:scale-110"
          fallbackBgClassName="bg-gradient-to-br from-rose-100 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/20"
          fallbackIconClassName="h-8 w-8 text-rose-500/70 dark:text-rose-400/70"
        />
        <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-tight text-white shadow-sm">
          <TrendingDown className="h-2.5 w-2.5" strokeWidth={2.6} />
          {deal.discountPct}%
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold text-ink-500 dark:text-ink-400">
            {store}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[13px] font-bold leading-snug tracking-tight text-ink-900 dark:text-ink-50">
            {deal.name}
          </div>
        </div>

        <div className="mt-1.5">
          <div className="flex items-baseline gap-1.5">
            <DualMoney money={deal.finalPrice} size="sm" layout="inline" locale={locale} />
            <span className="text-[10.5px] text-ink-400 line-through dark:text-ink-500">
              {formatMoneyLocale(deal.referencePrice, locale)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {t('save', { amount: formatMoneyLocale(deal.savings, locale) })}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10.5px] text-ink-400 dark:text-ink-500">
              <Truck className="h-3 w-3" strokeWidth={1.8} />
              {shipLabel}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function Skeleton() {
  return <div className="h-[108px] animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />;
}
