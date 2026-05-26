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

export function StatCard({ icon: Icon, label, value, hint, tone = 'default', delta = null }: Props) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          tone === 'accent'
            ? 'bg-accent-50 text-accent-600 dark:bg-accent-950/40 dark:text-accent-300'
            : tone === 'success'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </div>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-[26px] font-extrabold tracking-tighter2 md:text-[30px]">
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
      {sign}{delta}
    </span>
  );
}
