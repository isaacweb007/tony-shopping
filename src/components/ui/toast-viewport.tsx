'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastVariant } from '@/stores/toast-store';
import { cn } from '@/lib/utils';

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES: Record<ToastVariant, string> = {
  success:
    'border-emerald-200 bg-white text-ink-900 dark:border-emerald-900/60 dark:bg-ink-900 dark:text-ink-50',
  error:
    'border-red-200 bg-white text-ink-900 dark:border-red-900/60 dark:bg-ink-900 dark:text-ink-50',
  info:
    'border-ink-200 bg-white text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50',
  warning:
    'border-amber-200 bg-white text-ink-900 dark:border-amber-900/60 dark:bg-ink-900 dark:text-ink-50',
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-accent-500',
  warning: 'text-amber-500',
};

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 md:bottom-24 md:right-6"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[item.variant];

  React.useEffect(() => {
    if (item.durationMs <= 0) return;
    const id = setTimeout(() => dismiss(item.id), item.durationMs);
    return () => clearTimeout(id);
  }, [item.id, item.durationMs, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex animate-fade-up items-start gap-2.5 rounded-2xl border px-3.5 py-3 shadow-card-hover',
        STYLES[item.variant],
      )}
    >
      <Icon className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', ICON_COLOR[item.variant])} strokeWidth={1.7} />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold tracking-tight">{item.title}</div>
        {item.description && (
          <div className="mt-0.5 text-[12px] leading-snug text-ink-500 dark:text-ink-400">
            {item.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-100"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}
