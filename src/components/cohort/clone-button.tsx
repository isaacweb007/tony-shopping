'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useShortlistStore } from '@/stores/shortlist-store';
import { haptic } from '@/lib/haptic';
import { toast } from '@/stores/toast-store';
import type { ShortlistSnap } from '@/types/shortlist';

interface Props {
  snaps: readonly ShortlistSnap[];
}

/**
 * Single-tap "fork this cohort into my own shortlist" button on /c/{slug}.
 * Idempotent: snaps already in the user's shortlist are skipped (we only
 * add what's missing). After cloning, the next visit to /compare shows
 * the same set — the user can then edit, re-rank, and re-share.
 *
 * We deliberately don't auto-navigate; cloning shouldn't yank the user
 * off the cohort they were inspecting. A secondary "내 비교함 열기" link
 * appears alongside after success.
 */
export function CohortCloneButton({ snaps }: Props) {
  const t = useTranslations('compare.clone');
  const items = useShortlistStore((s) => s.items);
  const add = useShortlistStore((s) => s.add);
  const [done, setDone] = React.useState(false);

  // Filter to snaps the user doesn't already have. Computed once per
  // (items, snaps) — small list, cheap, and the toast wording depends
  // on whether ANY snap was new.
  const missing = React.useMemo(
    () => snaps.filter((s) => !(s.id in items)),
    [snaps, items],
  );

  function clone() {
    if (missing.length === 0) {
      toast.info(t('allAlreadyIn'));
      haptic('tap');
      setDone(true);
      return;
    }
    for (const snap of missing) {
      add({ ...snap, addedAt: Date.now() });
    }
    haptic('success');
    toast.success(t('added', { n: missing.length }));
    setDone(true);
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={clone}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-[13px] font-bold text-white transition hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
      >
        {done ? (
          <BookmarkCheck className="h-4 w-4" strokeWidth={2.2} />
        ) : (
          <Bookmark className="h-4 w-4" strokeWidth={2} />
        )}
        {t('button')}
      </button>
      {done && (
        <Link
          href="/compare"
          className="inline-flex h-10 items-center rounded-xl border border-ink-200 px-4 text-[13px] font-bold text-ink-700 transition hover:border-accent-300 hover:text-accent-700 dark:border-ink-700 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-accent-300"
        >
          {t('openMine')}
        </Link>
      )}
    </div>
  );
}
