'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface Slice {
  label: string;
  value: number;
}

interface Props {
  /** Sorted descending. Up to 8 slices; remainder becomes "Other". */
  data: Slice[];
  title: string;
  emptyHint: string;
}

const PALETTE = [
  '#7c3aed', // accent-600
  '#2563eb', // blue
  '#0891b2', // cyan
  '#16a34a', // emerald
  '#d97706', // amber
  '#db2777', // pink
  '#dc2626', // red
  '#52525b', // ink-600
];

const RADIUS = 42;
const STROKE = 16;
const CIRC = 2 * Math.PI * RADIUS;

export function DonutChart({ data, title, emptyHint }: Props) {
  const t = useTranslations('dashboard');
  // Collapse extras into "Other"
  const top = data.slice(0, 7);
  const restSum = data.slice(7).reduce((a, s) => a + s.value, 0);
  const slices = restSum > 0 ? [...top, { label: t('other'), value: restSum }] : top;

  const total = slices.reduce((a, s) => a + s.value, 0);

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {title}
      </div>

      {total === 0 ? (
        <p className="mt-4 text-[13px] text-ink-500 dark:text-ink-400">{emptyHint}</p>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0 -rotate-90">
            {(() => {
              let offset = 0;
              return slices.map((s, i) => {
                const ratio = s.value / total;
                const dash = ratio * CIRC;
                const node = (
                  <circle
                    key={s.label}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="transparent"
                    stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={STROKE}
                    strokeDasharray={`${dash} ${CIRC - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return node;
              });
            })()}
            <circle cx="50" cy="50" r={RADIUS - STROKE / 2 - 0.5} fill="white" className="dark:fill-ink-900" />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              className="rotate-90 fill-ink-900 text-[14px] font-extrabold dark:fill-ink-50"
              style={{ transformOrigin: '50px 50px' }}
            >
              {total}
            </text>
          </svg>

          <ul className="grid w-full grid-cols-1 gap-1 text-[12.5px] sm:grid-cols-1 sm:flex-1">
            {slices.map((s, i) => {
              const pct = Math.round((s.value / total) * 100);
              return (
                <li key={s.label} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="truncate text-ink-800 dark:text-ink-100">{s.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-500 dark:text-ink-400">
                    {s.value} <span className="text-ink-400">· {pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
