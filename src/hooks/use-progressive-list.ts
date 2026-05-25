'use client';

import * as React from 'react';

interface Options<T> {
  items: readonly T[];
  /** How many to add per "page". */
  batchSize?: number;
  /** Reset visible window to the first batch whenever this key changes. */
  resetKey?: string | number | null;
}

interface Return<T> {
  visible: T[];
  hasMore: boolean;
  loadMore: () => void;
  /** Spread onto a sentinel div that lives at the end of the rendered list. */
  sentinelRef: React.RefObject<HTMLDivElement>;
}

/**
 * Client-side progressive disclosure for an already-fetched list. The hook
 * keeps a `count` cursor; loadMore extends it by batchSize; an
 * IntersectionObserver attached to a sentinel element extends it as the user
 * scrolls. The resetKey input snaps the cursor back to the first batch when
 * the underlying query/filter changes — otherwise users would see a tiny
 * window of an unrelated result set after switching stores.
 */
export function useProgressiveList<T>({
  items,
  batchSize = 12,
  resetKey = null,
}: Options<T>): Return<T> {
  const [count, setCount] = React.useState(batchSize);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Reset whenever the underlying list identity (or resetKey) changes.
  React.useEffect(() => {
    setCount(batchSize);
  }, [resetKey, batchSize]);

  // Clamp when the source list shrinks below current count.
  React.useEffect(() => {
    if (count > items.length && items.length > 0) {
      setCount(items.length);
    }
  }, [count, items.length]);

  const hasMore = count < items.length;

  const loadMore = React.useCallback(() => {
    setCount((c) => (c >= items.length ? c : Math.min(items.length, c + batchSize)));
  }, [items.length, batchSize]);

  // Sentinel observer.
  React.useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return; // SSR / very old browsers
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: '240px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  const visible = React.useMemo(() => items.slice(0, count), [items, count]);

  return { visible, hasMore, loadMore, sentinelRef };
}
