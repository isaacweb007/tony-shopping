import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'accent' | 'success';
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'default' }: Props) {
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
      <div className="mt-1 text-[26px] font-extrabold tracking-tighter2 md:text-[30px]">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[12px] text-ink-500 dark:text-ink-400">{hint}</div>}
    </div>
  );
}
