'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import { useClickStore } from '@/stores/click-store';
import { useHistoryStore } from '@/stores/history-store';
import { buildHeatmap } from '@/lib/insights/heatmap';

/**
 * Activity heatmap — 7 rows (Sun…Sat) × 24 columns (0…23h). Cells
 * are tinted by per-bucket count relative to the visible peak, so the
 * card reads as "darker = more active" without needing a numeric
 * legend. Hidden when there's barely any data (< 5 events).
 *
 * Sources: search history (q text) + click events (storefront opens).
 * Two-week window; pure render — heavy lifting in buildHeatmap.
 */
export function HeatmapCard() {
  const t = useTranslations('dashboard.heatmap');
  const history = useHistoryStore((s) => s.entries);
  const clicks = useClickStore((s) => s.events);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const heat = React.useMemo(() => {
    if (!mounted) return null;
    return buildHeatmap({
      events: [
        ...history.map((h) => ({ at: h.createdAt })),
        ...clicks.map((c) => ({ at: c.at })),
      ],
    });
  }, [mounted, history, clicks]);

  if (!heat) return null;

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
    (_, i) => t(`dayLabels.${i}` as 'dayLabels.0'),
  );

  return (
    <section className="mt-6 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        <Clock className="h-3 w-3" strokeWidth={2.4} />
        {t('eyebrow')}
      </div>
      <h2 className="mt-1 text-[16px] font-extrabold tracking-tight md:text-[18px]">
        {t('title', { total: heat.total })}
      </h2>

      {heat.total < 5 ? (
        <p className="mt-3 text-[12.5px] text-ink-500 dark:text-ink-400">{t('empty')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div
            className="grid gap-[2px] text-[10px] tabular-nums text-ink-400 dark:text-ink-500"
            style={{ gridTemplateColumns: 'auto repeat(24, minmax(10px, 1fr))' }}
            role="grid"
            aria-label={t('eyebrow')}
          >
            {/* header row: empty cell + 24 hour ticks (00, 03, 06, ...) */}
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-center text-[8.5px]">
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </div>
            ))}
            {/* 7 rows */}
            {heat.grid.map((row, day) => (
              <React.Fragment key={day}>
                <div className="pr-1 text-right text-[10px] font-semibold leading-[10px]">
                  {dayLabels[day]}
                </div>
                {row.map((n, hour) => (
                  <HeatCell
                    key={hour}
                    n={n}
                    peak={heat.peak}
                    title={t('a11y', {
                      day: dayLabels[day] ?? String(day),
                      hour,
                      count: n,
                    })}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Single cell. We map count/peak into 5 buckets so the heat reads in
 * discrete steps rather than a noisy gradient. Empty cells get a faint
 * tint so the grid stays visible at rest.
 */
function HeatCell({ n, peak, title }: { n: number; peak: number; title: string }) {
  const ratio = peak > 0 ? n / peak : 0;
  // 0 → ink-100; 1..0.2 → accent-200; 0.2..0.4 → accent-400; …
  const tone =
    n === 0
      ? 'bg-ink-100 dark:bg-ink-800/60'
      : ratio < 0.2
        ? 'bg-accent-200 dark:bg-accent-900/40'
        : ratio < 0.4
          ? 'bg-accent-300 dark:bg-accent-800/60'
          : ratio < 0.6
            ? 'bg-accent-400 dark:bg-accent-700/70'
            : ratio < 0.8
              ? 'bg-accent-500 dark:bg-accent-600/80'
              : 'bg-accent-600 dark:bg-accent-500';
  return <div className={'aspect-square rounded-sm ' + tone} title={title} role="gridcell" />;
}
