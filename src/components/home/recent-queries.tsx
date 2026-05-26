'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useHistoryStore } from '@/stores/history-store';

/**
 * Quick row under the hero AskBox that surfaces the user's most-recent
 * search queries (top 3, dedupe-friendly because history-store already
 * dedupes by `q` when inserting). Lets returning users skip retyping
 * the same phrase to re-run a familiar comparison.
 *
 * Hidden when the user has fewer than 2 entries — a single chip on its
 * own competes with the prompt chips and adds noise without value.
 */
export function RecentQueries() {
  const t = useTranslations('home.recentQueries');
  const entries = useHistoryStore((s) => s.entries);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // entries[] is already sorted newest-first by history-store.add, and
  // already deduped by `q`. We take 3 to keep the row visually quiet and
  // skip any with empty queries (image-only searches without text).
  const top = entries.filter((e) => e.q.trim().length > 0).slice(0, 3);
  if (top.length < 2) return null;

  return (
    <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-1.5 px-4 text-[12px]">
      <span className="mr-1 inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
        <Search className="h-3 w-3" strokeWidth={2.4} />
        {t('label')}
      </span>
      {top.map((e) => (
        <Link
          key={e.id}
          href={`/search?q=${encodeURIComponent(e.q)}`}
          className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 font-semibold tracking-tight text-ink-700 transition hover:border-accent-300 hover:text-accent-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-accent-300"
        >
          <span className="truncate">{e.q}</span>
        </Link>
      ))}
    </div>
  );
}
