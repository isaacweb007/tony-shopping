'use client';

import * as React from 'react';
import { useClickStore } from '@/stores/click-store';
import { inferPriority, type AutoPriorityResult } from '@/lib/compare/auto-priority';

/**
 * Subscribes to the local click ledger and re-runs the auto-priority inference
 * whenever it changes. Returns null when there's no confident recommendation.
 *
 * Pure client side — never touches the network. Safe to call before mount
 * (returns null during SSR / hydration).
 */
export function useAutoPriority(): AutoPriorityResult | null {
  const events = useClickStore((s) => s.events);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return React.useMemo(() => {
    if (!mounted) return null;
    return inferPriority(events);
  }, [mounted, events]);
}
