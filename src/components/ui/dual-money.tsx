'use client';

import { useLocale } from 'next-intl';
import { formatMoneyDual } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Money } from '@/types/product';
import type { AppLocale } from '@/i18n/routing';

interface Props {
  money: Money;
  /** Visual scale of the primary value. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** "stacked" = secondary on its own line; "inline" = same line, smaller. */
  layout?: 'stacked' | 'inline';
  className?: string;
  /** Override the locale (useful for SSR pages where context isn't set). */
  locale?: AppLocale;
}

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  xs: 'text-[12px] font-bold tracking-tight',
  sm: 'text-[14px] font-extrabold tracking-tighter2',
  md: 'text-[16px] font-extrabold tracking-tighter2',
  lg: 'text-[22px] font-extrabold tracking-tighter2',
  xl: 'text-[28px] font-extrabold tracking-tighter2',
};

const SECONDARY_CLASSES: Record<NonNullable<Props['size']>, string> = {
  xs: 'text-[10px]',
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-[12px]',
  xl: 'text-[13px]',
};

/**
 * Renders the user's preferred-currency price big, with the original currency
 * muted alongside or beneath. When original == preferred (or FX cache is cold)
 * only the primary line shows — there's no value in "₩329,000 (₩329,000)".
 */
export function DualMoney({ money, size = 'md', layout = 'stacked', className, locale: localeProp }: Props) {
  const ctxLocale = useLocale() as AppLocale;
  const locale = localeProp ?? ctxLocale;
  const { primary, secondary } = formatMoneyDual(money, locale);

  if (layout === 'inline') {
    return (
      <span className={cn('inline-flex items-baseline gap-1.5', className)}>
        <span className={SIZE_CLASSES[size]}>{primary}</span>
        {secondary && (
          <span className={cn(SECONDARY_CLASSES[size], 'font-medium text-ink-400 dark:text-ink-500')}>
            ≈ {secondary}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex flex-col items-start leading-none', className)}>
      <span className={SIZE_CLASSES[size]}>{primary}</span>
      {secondary && (
        <span className={cn(SECONDARY_CLASSES[size], 'mt-0.5 font-medium text-ink-400 dark:text-ink-500')}>
          ≈ {secondary}
        </span>
      )}
    </span>
  );
}
