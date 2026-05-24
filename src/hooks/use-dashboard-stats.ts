'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClickStore } from '@/stores/click-store';
import { useHistoryStore } from '@/stores/history-store';
import { useShortlistStore } from '@/stores/shortlist-store';
import { useAuthStore } from '@/stores/auth-store';
import type { ServerStats } from '@/app/api/dashboard/stats/route';
import type { StoreId, TonyTag } from '@/types/product';

export interface MergedStats {
  signedIn: boolean;
  searches: number;
  shortlist: number;
  clicks: number;
  verdictClicks: number;
  storeBreakdown: Array<{ store: StoreId | string; count: number }>;
  tagBreakdown: Array<{ tag: TonyTag | string; count: number }>;
}

/**
 * Merges signed-in server stats with local stores so the dashboard is never
 * empty. When not signed in, only LocalStorage is consulted.
 */
export function useDashboardStats(): MergedStats {
  const user = useAuthStore((s) => s.user);
  const localClicks = useClickStore((s) => s.events);
  const localHistory = useHistoryStore((s) => s.entries);
  const localShortlistCount = useShortlistStore((s) => Object.keys(s.items).length);

  const server = useQuery({
    queryKey: ['dashboard-stats', user?.id ?? 'anon'],
    queryFn: async (): Promise<ServerStats> => {
      const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error('stats fetch failed');
      return (await res.json()) as ServerStats;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return React.useMemo<MergedStats>(() => {
    const localStoreMap = new Map<string, number>();
    const localTagMap = new Map<string, number>();
    let verdict = 0;
    for (const ev of localClicks) {
      localStoreMap.set(ev.store, (localStoreMap.get(ev.store) ?? 0) + 1);
      localTagMap.set(ev.tag, (localTagMap.get(ev.tag) ?? 0) + 1);
      if (ev.fromVerdict) verdict += 1;
    }

    if (!server.data || !server.data.signedIn) {
      return {
        signedIn: false,
        searches: localHistory.length,
        shortlist: localShortlistCount,
        clicks: localClicks.length,
        verdictClicks: verdict,
        storeBreakdown: [...localStoreMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([store, count]) => ({ store, count })),
        tagBreakdown: [...localTagMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([tag, count]) => ({ tag, count })),
      };
    }

    // Merge: server is authoritative for totals, local is fallback for breakdown
    // when server hasn't received any clicks yet (sync from local to server
    // will land in a later round).
    const stats: MergedStats = {
      signedIn: true,
      searches: Math.max(server.data.searches, localHistory.length),
      shortlist: Math.max(server.data.shortlist, localShortlistCount),
      clicks: Math.max(server.data.clicks, localClicks.length),
      verdictClicks: Math.max(server.data.verdictClicks, verdict),
      storeBreakdown:
        server.data.storeBreakdown.length > 0
          ? server.data.storeBreakdown
          : [...localStoreMap.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([store, count]) => ({ store, count })),
      tagBreakdown:
        server.data.tagBreakdown.length > 0
          ? server.data.tagBreakdown
          : [...localTagMap.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([tag, count]) => ({ tag, count })),
    };
    return stats;
  }, [server.data, localClicks, localHistory.length, localShortlistCount]);
}
