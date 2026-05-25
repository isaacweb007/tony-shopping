'use client';

import { useQuery } from '@tanstack/react-query';
import type { ShortlistSnap } from '@/types/shortlist';
import type { ComparePriority } from '@/lib/compare/verdict';
import { convertMoneySync } from '@/lib/currency';

interface NarrativeResponse {
  narrative: string;
  source: 'anthropic' | 'openai' | 'fallback';
}

interface Args {
  snaps: ShortlistSnap[];
  priority: ComparePriority;
  winnerId: string | null;
  reasonKeys: string[];
  /** Pre-rendered price strings keyed by snap id (locale-aware). */
  priceLabels: Record<string, string>;
  locale: 'ko' | 'en' | 'vi';
}

/**
 * Narrative is the slow, opinion-flavoured layer on top of the rule-based
 * verdict. It re-fetches whenever the cohort composition, the user's stated
 * priority, or the rule-based winner changes — so the user sees the
 * explanation move in lockstep with their choices.
 */
export function useCompareNarrative({
  snaps,
  priority,
  winnerId,
  reasonKeys,
  priceLabels,
  locale,
}: Args) {
  const enabled = snaps.length >= 2;
  const cohortKey = snaps.map((s) => s.id).join(',');

  return useQuery({
    queryKey: ['compare-narrative', cohortKey, priority, winnerId, locale],
    enabled,
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<NarrativeResponse> => {
      const body = {
        locale,
        priority,
        reasonKeys,
        candidates: snaps.map((s) => {
          const usd = convertMoneySync(s.finalPrice, 'USD');
          return {
            id: s.id,
            name: s.name.slice(0, 200),
            store: String(s.store),
            priceUsd: usd.currency === 'USD' && Number.isFinite(usd.amount) ? usd.amount : null,
            priceLabel: priceLabels[s.id] ?? '',
            shipDays: s.shipDays ?? null,
            rating: s.rating ?? null,
            reviewCount: s.reviewCount ?? null,
            authenticityPct: s.authenticityPct ?? null,
            official: !!s.official,
            tonyScore: s.score?.total ?? null,
            isWinner: s.id === winnerId,
          };
        }),
      };
      const res = await fetch('/api/compare-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok) throw new Error('narrative fetch failed');
      return (await res.json()) as NarrativeResponse;
    },
  });
}
