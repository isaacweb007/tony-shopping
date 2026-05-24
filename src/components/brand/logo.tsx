import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withWordmark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { mark: 'w-7 h-7 text-[13px]', text: 'text-[15px]' },
  md: { mark: 'w-8 h-8 text-[15px]', text: 'text-[17px]' },
  lg: { mark: 'w-10 h-10 text-lg', text: 'text-xl' },
};

export function Logo({ size = 'md', withWordmark = true, className }: LogoProps) {
  const s = sizeMap[size];
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className={cn(
          'logo-mark inline-flex items-center justify-center rounded-[10px] font-extrabold text-white shadow-pop',
          s.mark,
        )}
      >
        T
      </span>
      {withWordmark && (
        <span className={cn('font-extrabold tracking-tighter2', s.text)}>
          Tony<span className="text-accent-600 dark:text-accent-400">Shopping</span>
        </span>
      )}
    </span>
  );
}
