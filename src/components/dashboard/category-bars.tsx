'use client';

import { useTranslations } from 'next-intl';
import { useUserProfileStore } from '@/stores/user-profile-store';
import type { Category } from '@/lib/categorize';

interface Props {
  title: string;
  emptyHint: string;
}

/**
 * Horizontal bars showing which categories Tony has seen the user search for
 * most. Pulls straight from the on-device user-profile store (Phase 5+ will
 * also fold in server-side history when we sync the history table).
 */
export function CategoryBars({ title, emptyHint }: Props) {
  const tr = useTranslations('recommend');
  const profile = useUserProfileStore((s) => s.profile);

  const entries = Object.entries(profile.categories) as [Category, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 8);
  const peak = top[0]?.[1] ?? 0;

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {title}
      </div>

      {top.length === 0 || peak === 0 ? (
        <p className="mt-4 text-[13px] text-ink-500 dark:text-ink-400">{emptyHint}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {top.map(([cat, count]) => {
            const pct = Math.round((count / peak) * 100);
            return (
              <li key={cat}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ink-800 dark:text-ink-100">{tr(`cat.${cat}`)}</span>
                  <span className="tabular-nums text-ink-500 dark:text-ink-400">{count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-600 to-blue-500 transition-[width] duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
