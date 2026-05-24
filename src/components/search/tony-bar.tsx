import { cn } from '@/lib/utils';

export function TonyBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn(
        'h-[3px] overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800',
        className,
      )}
    >
      <span
        className="block h-full rounded-full bg-gradient-to-r from-accent-600 to-blue-600 transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
