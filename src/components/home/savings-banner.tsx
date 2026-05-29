'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PiggyBank, TrendingDown } from 'lucide-react';
import { useSavingsStore } from '@/stores/savings-store';
import { localeCurrency } from '@/lib/currency';
import { formatMoney } from '@/lib/format';
import type { AppLocale } from '@/i18n/routing';

/**
 * "토니로 지금까지 ₩X 아꼈어요" — cumulative savings banner.
 *
 * The retention + value hook: a number that only grows each time the user
 * acts on a Tony recommendation that beat the market median. Renders
 * nothing until the user has banked at least one saving, so first-time
 * visitors don't see an empty ₩0.
 *
 * Hydration-safe: the store returns [] on the server pass, so we gate the
 * render on a mounted flag to avoid a flash / mismatch.
 */
export function SavingsBanner() {
  const t = useTranslations('home.savings');
  const locale = useLocale() as AppLocale;
  const events = useSavingsStore((s) => s.events);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const currency = localeCurrency(locale);
  const total = events
    .filter((e) => e.currency === currency)
    .reduce((sum, e) => sum + e.amount, 0);
  const count = events.filter((e) => e.currency === currency).length;

  if (total <= 0 || count === 0) return null;

  return (
    <section className="mt-8" aria-label={t('aria')}>
      <div className="relative overflow-hidden rounded-2xl border border-emerald-300/60 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 p-4 shadow-sm dark:border-emerald-800/50 dark:from-emerald-950/40 dark:via-ink-900 dark:to-emerald-950/10 md:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div className="relative flex items-center gap-3.5">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
            <PiggyBank className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              {t('label')}
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[22px] font-extrabold tabular-nums tracking-tighter2 text-emerald-800 dark:text-emerald-100 md:text-[26px]">
                {formatMoney({ amount: total, currency }, locale)}
              </span>
              <span className="text-[12.5px] text-ink-600 dark:text-ink-300">
                {t('subtitle', { count })}
              </span>
            </div>
          </div>
          <TrendingDown
            className="hidden h-6 w-6 shrink-0 text-emerald-500/70 sm:block"
            strokeWidth={1.8}
          />
        </div>
      </div>
    </section>
  );
}
