'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, GitCompare } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useShortlistStore } from '@/stores/shortlist-store';
import { cn } from '@/lib/utils';

/**
 * Sticky floating CTA on /product/[id] (and any other page that mounts it).
 * Appears only when the local shortlist has ≥ 2 snaps AND the user has
 * scrolled past the hero (≥ 400px). One job: remind the user they have a
 * compare set going and offer a one-tap jump to /compare.
 *
 * The chat-panel floating bubble lives at the same corner; we offset upward
 * by 16 + 56 + 16 px so the two stack cleanly without overlap.
 */
export function FloatingCompareBar() {
  const t = useTranslations('compare');
  const count = useShortlistStore((s) => Object.keys(s.items).length);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY >= 400);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const visible = count >= 2 && scrolled;
  if (!visible) return null;

  return (
    <div
      className="print-hide fixed bottom-[88px] right-4 z-30 animate-fade-in md:right-6"
      role="region"
      aria-label={t('floatingCta')}
    >
      <Link
        href="/compare"
        className={cn(
          'group inline-flex items-center gap-2.5 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-bold text-white shadow-card-hover ring-1 ring-white/10 backdrop-blur transition hover:-translate-y-px hover:bg-ink-800',
          'dark:bg-white dark:text-ink-900 dark:ring-ink-900/10 dark:hover:bg-ink-100',
        )}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-[11px] font-extrabold text-white">
          {count}
        </span>
        <GitCompare className="h-4 w-4" strokeWidth={2.2} />
        <span>{t('floatingCta')}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
      </Link>
    </div>
  );
}
