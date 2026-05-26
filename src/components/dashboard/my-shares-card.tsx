'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Share2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useMySharesStore } from '@/stores/my-shares-store';

/**
 * "내가 공유한 비교" card — gives the user a stable launcher back into
 * /cohorts after they've shared. Cohort shares are anonymous server-side,
 * so the count comes from the local my-shares-store (slugs the user
 * created on this device). Hidden until ≥ 1 share so a fresh dashboard
 * doesn't grow visual weight for no payoff.
 */
export function MySharesCard() {
  const t = useTranslations('dashboard.myShares');
  const slugs = useMySharesStore((s) => s.slugs);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted || slugs.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-accent-200 bg-accent-50/40 p-4 dark:border-accent-800/50 dark:bg-accent-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
            <Share2 className="h-3 w-3" strokeWidth={2.4} />
            {t('eyebrow')}
          </div>
          <p className="mt-1 text-[14.5px] font-semibold tracking-tight text-ink-800 dark:text-ink-100">
            {t('title', { n: slugs.length })}
          </p>
        </div>
        <Link
          href="/cohorts"
          className="shrink-0 rounded-xl bg-accent-600 px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-400"
        >
          {t('cta')}
        </Link>
      </div>
    </section>
  );
}
