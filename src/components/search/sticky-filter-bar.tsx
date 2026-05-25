'use client';

import * as React from 'react';
import { FilterBar } from './filter-bar';
import { cn } from '@/lib/utils';

/**
 * StickyFilterBar — pins the FilterBar below the site header once the user
 * scrolls past it, and applies an elevated visual state so cards behind the
 * bar don't blend into it.
 *
 * Detection: a 1px sentinel sits directly above the bar. While the sentinel
 * is in view, the bar is at its rest position (no shadow). When the sentinel
 * scrolls out, the bar is pinned and we add a soft border + shadow + slightly
 * stronger backdrop.
 */
export function StickyFilterBar() {
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = React.useState(false);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setPinned(!(entry?.isIntersecting ?? true)),
      { rootMargin: '-56px 0px 0px 0px' }, // header is 56px; pin once we cross it
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <div
        data-pinned={pinned}
        className={cn(
          'sticky top-14 z-30 -mx-4 px-4 py-3 transition-[box-shadow,background-color,backdrop-filter] md:-mx-6 md:px-6 md:top-16',
          pinned
            ? 'border-b border-ink-200/70 bg-white/85 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-ink-800/70 dark:bg-ink-950/85'
            : 'bg-transparent',
        )}
      >
        <FilterBar />
      </div>
    </>
  );
}
