'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { PartyPopper, Sparkles, TrendingUp } from 'lucide-react';
import { useClickStore } from '@/stores/click-store';
import { useHistoryStore } from '@/stores/history-store';
import { useShortlistStore } from '@/stores/shortlist-store';
import { buildWeeklyInsights, type Insight } from '@/lib/insights/weekly';
import { cn } from '@/lib/utils';

export function InsightsRow() {
  const t = useTranslations('dashboard.insights');
  const clicks = useClickStore((s) => s.events);
  const history = useHistoryStore((s) => s.entries);
  const items = useShortlistStore((s) => s.items);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const insights = React.useMemo<Insight[]>(() => {
    if (!mounted) return [];
    return buildWeeklyInsights({
      clicks,
      history: history.map((h) => ({ at: h.createdAt })),
      shortlist: Object.values(items),
    });
  }, [mounted, clicks, history, items]);

  if (insights.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        <Sparkles className="h-3 w-3" strokeWidth={2.4} />
        {t('heading')}
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {insights.map((insight) => (
          <InsightCard key={insight.key} insight={insight} />
        ))}
      </ul>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const t = useTranslations('dashboard.insights');
  const Icon =
    insight.severity === 'celebration' ? PartyPopper : insight.severity === 'nudge' ? TrendingUp : Sparkles;
  const tone =
    insight.severity === 'celebration'
      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
      : insight.severity === 'nudge'
        ? 'border-amber-200 bg-amber-50/60 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
        : 'border-accent-200 bg-accent-50/60 text-accent-800 dark:border-accent-900/50 dark:bg-accent-950/30 dark:text-accent-100';

  // Translation lookup goes through a cast so the strict `keyof Messages`
  // narrowing doesn't fight per-insight keys; the engine's InsightKey enum
  // is the source of truth for which lookups are valid.
  const vars = insight.vars ?? {};
  const localisedVars =
    insight.key === 'autoPriorityHint'
      ? { ...vars, signal: t(`signal.${vars.signal as 'value' | 'fast' | 'genuine'}` as 'signal.value') }
      : vars;

  return (
    <li className={cn('flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-[13px]', tone)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.9} />
      <div className="leading-snug">
        <b className="font-bold">
          {t(`${insight.key}.title` as 'thisWeekSearches.title', localisedVars)}
        </b>
        <span className="ml-1 font-normal">
          {t(`${insight.key}.body` as 'thisWeekSearches.body', localisedVars)}
        </span>
      </div>
    </li>
  );
}
