import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import type { TonyTag } from '@/types/product';
import { cn } from '@/lib/utils';

const STYLES: Record<TonyTag, string> = {
  best: 'bg-ink-900 text-white dark:bg-white dark:text-ink-900',
  cheap: 'bg-emerald-600 text-white',
  fast: 'bg-amber-500 text-white',
  genuine: 'bg-sky-600 text-white',
  value: 'bg-pink-600 text-white',
  alt: 'bg-ink-700 text-white dark:bg-ink-200 dark:text-ink-900',
  not: 'border border-red-200 bg-red-100 text-red-700',
};

export function TagBadge({
  tag,
  size = 'md',
  withIcon = true,
}: {
  tag: TonyTag;
  size?: 'sm' | 'md';
  withIcon?: boolean;
}) {
  const t = useTranslations('tags');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-bold tracking-wider',
        STYLES[tag],
        size === 'sm' ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2 py-1 text-[10.5px]',
      )}
    >
      {withIcon && <Sparkles className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={2.2} />}
      {t(tag)}
    </span>
  );
}
