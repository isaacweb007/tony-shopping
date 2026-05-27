import { TrendingDown, TrendingUp, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'accent' | 'success';
  /**
   * Week-over-week signed delta. Renders a tiny ± pill next to the value.
   * Omit (or pass null) for KPIs that don't have a meaningful WoW number.
   */
  delta?: number | null;
}

/**
 * StatCard — KPI tile shared across /dashboard.
 *
 * Tone variants share the verdict / metrics-tiles visual vocabulary:
 *   - accent  → purple gradient (Tony's brand)
 *   - success → emerald gradient (positive shopping signal)
 *   - default → soft ink gradient (neutral count)
 *
 * Subtle gradient backgrounds + colored borders make these read as
 * status tiles, not flat cards — which is the same energy as the
 * MetricsTiles row on /search.
 */
const TONE_STYLES = {
  default: {
    container:
      'border-ink-200 bg-gradient-to-br from-white via-white to-ink-50/60 dark:border-ink-800 dark:from-ink-900 dark:via-ink-900 dark:to-ink-800/40',
    iconWrap: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
    valueAccent: 'text-ink-900 dark:text-ink-50',
  },
  accent: {
    container:
      'border-accent-200/80 bg-gradient-to-br from-accent-50/70 via-white to-accent-50/30 dark:border-accent-800/50 dark:from-accent-950/30 dark:via-ink-900 dark:to-accent-950/10',
    iconWrap: 'bg-accent-100 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300',
    valueAccent: 'text-accent-900 dark:text-accent-100',
  },
  success: {
    container:
      'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 dark:border-emerald-800/50 dark:from-emerald-950/30 dark:via-ink-900 dark:to-emerald-950/10',
    iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    valueAccent: 'text-emerald-900 dark:text-emerald-100',
  },
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
  delta = null,
}: Props) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={cn('rounded-2xl border p-5 shadow-sm', styles.container)}>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', styles.iconWrap)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </div>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div
          className={cn(
            'text-[26px] font-extrabold tabular-nums tracking-tighter2 md:text-[30px]',
            styles.valueAccent,
          )}
        >
          {value}
        </div>
        {delta !== null ? <WowPill delta={delta} /> : null}
      </div>
      {hint && <div className="mt-0.5 text-[12px] text-ink-500 dark:text-ink-400">{hint}</div>}
    </div>
  );
}

/**
 * Inline week-over-week delta pill. Up = green, down = red, zero = neutral.
 * "+N" sign on positive moves so the user instantly reads direction without
 * parsing the icon.
 */
function WowPill({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-ink-100 px-1 py-0.5 text-[10px] font-bold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
        <Minus className="h-2.5 w-2.5" strokeWidth={2.4} />0
      </span>
    );
  }
  const isUp = delta > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const sign = isUp ? '+' : '';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold tabular-nums',
        isUp
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
      )}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.4} />
      {sign}
      {delta}
    </span>
  );
}
